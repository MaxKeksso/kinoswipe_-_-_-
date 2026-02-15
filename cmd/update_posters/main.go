// Обновляет poster_url у фильмов без постера, запрашивая OMDb API (по title + year).
// Нужен бесплатный API-ключ: https://www.omdbapi.com/apikey.aspx
//
// Использование:
//   export OMDB_API_KEY=ваш_ключ
//   export DATABASE_URL=postgres://...
//   go run ./cmd/update_posters
//   или: ./обновить_постеры.sh
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"kinoswipe/config"
	"kinoswipe/database"
	"kinoswipe/repository"
)

const omdbURL = "https://www.omdbapi.com/"

func main() {
	apiKey := os.Getenv("OMDB_API_KEY")
	if apiKey == "" {
		log.Fatal("Задайте OMDB_API_KEY (бесплатный ключ: https://www.omdbapi.com/apikey.aspx)")
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
	movies, err := repo.GetAll(5000)
	if err != nil {
		log.Fatalf("GetAll: %v", err)
	}

	log.Printf("Всего фильмов в БД: %d", len(movies))
	forceAll := os.Getenv("UPDATE_ALL") == "1" || os.Getenv("UPDATE_ALL") == "true"

	updated := 0
	skipped := 0
	for i, m := range movies {
		poster := strings.TrimSpace(m.PosterURL)
		hasValidPoster := poster != "" && poster != "N/A" &&
			(strings.HasPrefix(poster, "http://") || strings.HasPrefix(poster, "https://"))
		if hasValidPoster && !forceAll {
			skipped++
			continue
		}
		u, err := fetchPosterURL(apiKey, m.Title, m.Year)
		if err != nil {
			log.Printf("[%d] %q (year %d): %v", i+1, m.Title, m.Year, err)
			continue
		}
		if u == "" {
			continue
		}
		m.PosterURL = u
		if err := repo.Update(&m); err != nil {
			log.Printf("[%d] %q: update failed: %v", i+1, m.Title, err)
			continue
		}
		updated++
		log.Printf("[%d] %q -> %s", i+1, m.Title, u)
		time.Sleep(200 * time.Millisecond) // лимит бесплатного API
	}
	if skipped > 0 && updated == 0 {
		log.Printf("Пропущено (уже есть постер): %d. Чтобы обновить все постеры заново: UPDATE_ALL=1 ./обновить_постеры.sh", skipped)
	}
	log.Printf("Готово. Обновлено постеров: %d", updated)
}

func fetchPosterURL(apiKey, title string, year int) (string, error) {
	q := url.Values{}
	q.Set("apikey", apiKey)
	q.Set("t", title)
	if year > 0 {
		q.Set("y", fmt.Sprintf("%d", year))
	}
	req, err := http.NewRequest(http.MethodGet, omdbURL+"?"+q.Encode(), nil)
	if err != nil {
		return "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var data struct {
		Response string `json:"Response"`
		Poster   string `json:"Poster"`
		Error    string `json:"Error"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return "", err
	}
	if data.Response != "True" || data.Poster == "" {
		return "", fmt.Errorf("not found or no poster")
	}
	return strings.TrimSpace(data.Poster), nil
}
