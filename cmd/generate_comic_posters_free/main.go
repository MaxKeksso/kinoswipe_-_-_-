// Генерация комикс-постеров через Pollinations.ai (БЕСПЛАТНО, без API ключей).
//
// Скрипт строит URL Pollinations.ai с промптом в стиле комикса и сохраняет его
// напрямую в поле comic_poster_url в таблице movies.
//
// Использование:
//
//	go run ./cmd/generate_comic_posters_free
//	go run ./cmd/generate_comic_posters_free --force   # перегенерировать все
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"kinoswipe/config"
	"kinoswipe/database"
	"kinoswipe/repository"
)

func main() {
	force := len(os.Args) > 1 && os.Args[1] == "--force"

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

		rating := 0.0
		if m.IMDbRating != nil {
			rating = *m.IMDbRating
		}

		prompt := buildPrompt(m.Title, m.Year, m.Genre, m.Description)
		pollinationsURL := buildPollinationsURL(prompt, m.ID.String())

		if err := repo.UpdateComicPoster(m.ID, pollinationsURL); err != nil {
			log.Printf("[%d] Ошибка сохранения %q: %v", total+1, m.Title, err)
			continue
		}

		total++
		log.Printf("[%d/%d] %.1f ★  %s (%d) → OK", total, len(movies)-skipped, rating, m.Title, m.Year)
	}

	log.Printf("\nГотово! Сохранено: %d, Пропущено (уже есть): %d", total, skipped)
}

// buildPollinationsURL формирует URL Pollinations.ai с промптом и фиксированным seed
func buildPollinationsURL(prompt, movieID string) string {
	// Seed берём из первых 8 символов UUID для стабильности (одинаковый фильм = одна картинка)
	seed := 0
	for _, c := range movieID[:8] {
		seed = seed*31 + int(c)
	}
	if seed < 0 {
		seed = -seed
	}
	seed = seed % 9999999

	encoded := url.QueryEscape(prompt)
	return fmt.Sprintf(
		"https://image.pollinations.ai/prompt/%s?width=683&height=1024&nologo=true&seed=%d&model=flux",
		encoded, seed,
	)
}

// buildPrompt строит промпт в стиле комикса согласно инструкции
func buildPrompt(title string, year int, genreJSON, description string) string {
	// Парсим жанры
	var genreList []string
	_ = json.Unmarshal([]byte(genreJSON), &genreList)
	genres := strings.Join(genreList, ", ")
	if genres == "" {
		genres = "Drama"
	}

	// Сокращаем описание до 150 символов
	shortDesc := description
	if len(shortDesc) > 150 {
		shortDesc = shortDesc[:150]
	}

	// Определяем хэштеги настроения по жанрам
	vibes := moodTags(genreList)

	return fmt.Sprintf(
		`Comic book poster for film "%s" %d. Genre: %s. `+
			`THREE SECTIONS layout: `+
			`TOP (35%%): Big bold Russian manifesto quote 6-8 words about the film theme, white text with thick black outline on dark dramatic background, inspired by: %s. `+
			`MIDDLE (35%%): Three iconic symbolic objects representing key film elements, vintage comic illustration style, thick black ink outlines, vivid red yellow blue colors, halftone Ben-Day dots background. `+
			`BOTTOM (30%%): Three colorful comic starburst explosion shapes with bold Russian hashtag mood words: %s. `+
			`STYLE: 1960s American comic book art, bold black outlines, high contrast, distressed aged paper texture, halftone dots, dramatic shadows, vertical poster 2:3 ratio, no photorealism.`,
		title, year, genres,
		shortDesc,
		vibes,
	)
}

// moodTags возвращает 3 русских хэштега настроения по жанру фильма
func moodTags(genres []string) string {
	genreSet := map[string]bool{}
	for _, g := range genres {
		genreSet[strings.ToLower(strings.TrimSpace(g))] = true
	}

	tags := []string{}

	if genreSet["drama"] || genreSet["biography"] {
		tags = append(tags, "#судьба", "#страдание", "#надежда")
	} else if genreSet["crime"] || genreSet["thriller"] {
		tags = append(tags, "#опасность", "#предательство", "#риск")
	} else if genreSet["action"] || genreSet["adventure"] {
		tags = append(tags, "#адреналин", "#борьба", "#победа")
	} else if genreSet["comedy"] || genreSet["romance"] {
		tags = append(tags, "#дружба", "#любовь", "#радость")
	} else if genreSet["horror"] || genreSet["mystery"] {
		tags = append(tags, "#страх", "#тайна", "#выживание")
	} else if genreSet["sci-fi"] || genreSet["fantasy"] || genreSet["animation"] {
		tags = append(tags, "#мечта", "#будущее", "#магия")
	} else if genreSet["war"] || genreSet["history"] {
		tags = append(tags, "#честь", "#жертва", "#память")
	} else {
		tags = []string{"#судьба", "#выбор", "#истина"}
	}

	if len(tags) > 3 {
		tags = tags[:3]
	}
	return strings.Join(tags, " ")
}
