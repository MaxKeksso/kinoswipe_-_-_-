// Генерация комикс-постеров для фильмов через DALL-E 3 + загрузка на Cloudinary.
//
// Требуемые переменные окружения:
//   OPENAI_API_KEY         — ключ OpenAI
//   CLOUDINARY_CLOUD_NAME  — имя облака Cloudinary (напр. "my-cloud")
//   CLOUDINARY_API_KEY     — API ключ Cloudinary
//   CLOUDINARY_API_SECRET  — API секрет Cloudinary
//   DATABASE_URL           — строка подключения к PostgreSQL
//
// Использование:
//   go run ./cmd/generate_comic_posters
//
// Скрипт пропускает фильмы, у которых уже есть comic_poster_url.
// Для перегенерации всех: --force
package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"

	"kinoswipe/config"
	"kinoswipe/database"
	"kinoswipe/repository"

	"github.com/google/uuid"
)

func main() {
	force := len(os.Args) > 1 && os.Args[1] == "--force"

	// Проверяем переменные
	openaiKey := os.Getenv("OPENAI_API_KEY")
	if openaiKey == "" {
		log.Fatal("OPENAI_API_KEY не задан")
	}
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	cloudKey := os.Getenv("CLOUDINARY_API_KEY")
	cloudSecret := os.Getenv("CLOUDINARY_API_SECRET")
	if cloudName == "" || cloudKey == "" || cloudSecret == "" {
		log.Fatal("CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET не заданы")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Config: %v", err)
	}
	db, err := database.New(cfg.Database)
	if err != nil {
		log.Fatalf("Database: %v", err)
	}
	defer db.Close()

	repo := repository.NewMovieRepository(db.DB)

	movies, err := repo.GetAll(200)
	if err != nil {
		log.Fatalf("GetAll: %v", err)
	}

	total := 0
	skipped := 0
	for _, m := range movies {
		if m.ComicPosterURL != "" && !force {
			skipped++
			continue
		}

		log.Printf("[%d/%d] Генерирую постер для: %s (%.1f)", total+1, len(movies), m.Title, func() float64 {
			if m.IMDbRating != nil {
				return *m.IMDbRating
			}
			return 0
		}())

		prompt := buildPrompt(m.Title, m.TitleEn, m.Year, m.Genre, m.Description)

		// Генерация через DALL-E 3
		dalleURL, err := generateDalle(prompt, openaiKey)
		if err != nil {
			log.Printf("  DALL-E ошибка: %v — пропускаю", err)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Printf("  DALL-E OK: %s...", dalleURL[:60])

		// Загрузка на Cloudinary
		publicID := fmt.Sprintf("kinoswipe/comic/%s", m.ID.String())
		cloudURL, err := uploadToCloudinary(dalleURL, publicID, cloudName, cloudKey, cloudSecret)
		if err != nil {
			log.Printf("  Cloudinary ошибка: %v — пропускаю", err)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Printf("  Cloudinary OK: %s", cloudURL)

		// Сохраняем в БД
		if err := repo.UpdateComicPoster(m.ID, cloudURL); err != nil {
			log.Printf("  DB ошибка: %v", err)
			continue
		}

		total++
		log.Printf("  Сохранено (%d/%d)", total, len(movies)-skipped)

		// Пауза чтобы не превысить rate limit OpenAI (5 img/min на tier 1)
		time.Sleep(13 * time.Second)
	}

	log.Printf("\nГотово! Сгенерировано: %d, Пропущено (уже есть): %d", total, skipped)
}

// buildPrompt создаёт промпт для DALL-E 3 в стиле комикса
func buildPrompt(title, titleEn string, year int, genreJSON, description string) string {
	// Парсим жанры
	var genreList []string
	_ = json.Unmarshal([]byte(genreJSON), &genreList)
	genres := strings.Join(genreList, ", ")
	if genres == "" {
		genres = "Drama"
	}

	// Сокращаем описание до 200 символов
	shortDesc := description
	if len(shortDesc) > 200 {
		shortDesc = shortDesc[:200] + "..."
	}

	displayTitle := title
	if titleEn != "" && titleEn != title {
		displayTitle = titleEn
	}

	return fmt.Sprintf(`Comic book style movie poster for "%s" (%d). Genre: %s.

THREE DISTINCT HORIZONTAL SECTIONS:

TOP SECTION (top 35%%): Large dramatic bold text — a Russian language manifesto quote (6-10 words) capturing the film's soul. White text with thick colored outline, on dark background. Example theme: "%s"

MIDDLE SECTION (middle 35%%): Three distinct iconic objects or symbols representing key elements from this film, drawn in vintage comic book illustration style. Thick black ink outlines, vivid primary colors (red, yellow, blue), dynamic composition. Objects floating on halftone dot pattern (Ben-Day dots) background.

BOTTOM SECTION (bottom 30%%): Three colorful comic-style starburst/explosion shapes, each containing a bold Russian hashtag mood word (e.g. #дружба, #предательство, #надежда, #риск, #судьба) matching the film's emotional themes: %s.

STYLE: Classic 1960s American comic book art. Bold black ink outlines everywhere. High contrast warm and cool color palette. Slightly distressed aged paper texture with visible halftone dots. Dramatic shadows. Vertical poster format 2:3 ratio. No photorealism — pure graphic comic book illustration.`,
		displayTitle, year, genres, shortDesc, genres)
}

// generateDalle вызывает OpenAI DALL-E 3 и возвращает временный URL картинки
func generateDalle(prompt, apiKey string) (string, error) {
	reqBody := map[string]interface{}{
		"model":           "dall-e-3",
		"prompt":          prompt,
		"n":               1,
		"size":            "1024x1792",
		"quality":         "standard",
		"response_format": "url",
	}
	data, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/images/generations", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("DALL-E %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Data []struct {
			URL string `json:"url"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}
	if len(result.Data) == 0 || result.Data[0].URL == "" {
		return "", fmt.Errorf("пустой ответ DALL-E")
	}
	return result.Data[0].URL, nil
}

// uploadToCloudinary скачивает изображение с dalleURL и загружает на Cloudinary
func uploadToCloudinary(imageURL, publicID, cloudName, apiKey, apiSecret string) (string, error) {
	timestamp := fmt.Sprintf("%d", time.Now().Unix())

	// Параметры для подписи (без file и api_key)
	sigParams := map[string]string{
		"folder":    "kinoswipe/comic",
		"public_id": publicID,
		"timestamp": timestamp,
	}
	sig := cloudinarySignature(sigParams, apiSecret)

	// Multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("file", imageURL)
	_ = writer.WriteField("api_key", apiKey)
	_ = writer.WriteField("timestamp", timestamp)
	_ = writer.WriteField("signature", sig)
	_ = writer.WriteField("public_id", publicID)
	_ = writer.WriteField("folder", "kinoswipe/comic")
	writer.Close()

	uploadURL := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", cloudName)
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post(uploadURL, writer.FormDataContentType(), body)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Cloudinary %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		SecureURL string `json:"secure_url"`
		Error     struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse cloudinary: %w", err)
	}
	if result.Error.Message != "" {
		return "", fmt.Errorf("cloudinary error: %s", result.Error.Message)
	}
	if result.SecureURL == "" {
		return "", fmt.Errorf("пустой secure_url от Cloudinary")
	}
	return result.SecureURL, nil
}

// cloudinarySignature вычисляет подпись для Cloudinary API
func cloudinarySignature(params map[string]string, secret string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		v := url.QueryEscape(params[k])
		_ = v
		parts = append(parts, k+"="+params[k])
	}

	str := strings.Join(parts, "&") + secret
	h := sha1.New()
	h.Write([]byte(str))
	return fmt.Sprintf("%x", h.Sum(nil))
}

// Заглушка чтобы uuid не вылетел как unused
var _ = uuid.New
