// Генерация постеров в стиле тёмного кинематографичного нуара через Pollinations.ai (БЕСПЛАТНО).
//
// Строит URL Pollinations.ai с промптом multi-panel graphic novel и сохраняет в comic_poster_url.
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

	movies, err := repo.GetAll(300)
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

// buildPrompt строит промпт в стиле тёмного кинематографичного мульти-панельного нуара
func buildPrompt(title string, year int, genreJSON, description string) string {
	var genreList []string
	_ = json.Unmarshal([]byte(genreJSON), &genreList)
	genres := strings.Join(genreList, ", ")
	if genres == "" {
		genres = "Drama"
	}

	shortDesc := description
	if len(shortDesc) > 120 {
		shortDesc = shortDesc[:120]
	}

	atmosphere := moodAtmosphere(genreList)

	return fmt.Sprintf(
		`Dark cinematic multi-panel graphic novel movie poster for "%s" (%d). `+
			`%s diagonal comic panels arranged dynamically showing 6 key dramatic scenes from the film. `+
			`%s `+
			`Center panel: mysterious title element or key symbol from the story. `+
			`Art style: detailed painterly illustration, NOT cartoon, realistic facial portraits, `+
			`dramatic chiaroscuro lighting, deep shadows with selective highlights, `+
			`dark teal and charcoal color palette with intense orange and red fire/lightning accents, `+
			`gritty cinematic texture, professional graphic novel cover art, `+
			`thick black panel borders with diagonal cuts, atmospheric fog and rain, `+
			`film noir aesthetic, intense emotional scenes, vertical portrait format 2:3.`,
		title, year,
		atmosphere,
		genreMoodScene(shortDesc, genres),
	)
}

func moodAtmosphere(genres []string) string {
	genreSet := map[string]bool{}
	for _, g := range genres {
		genreSet[strings.ToLower(strings.TrimSpace(g))] = true
	}

	if genreSet["horror"] || genreSet["mystery"] {
		return "Eerie horror atmosphere, dark fog, supernatural tension,"
	} else if genreSet["crime"] || genreSet["thriller"] {
		return "Noir crime thriller atmosphere, rain-soaked streets, shadowy figures,"
	} else if genreSet["action"] || genreSet["adventure"] {
		return "Epic action adventure atmosphere, explosive energy, dynamic combat,"
	} else if genreSet["war"] || genreSet["history"] {
		return "Grim war epic atmosphere, battlefield smoke, heroic sacrifice,"
	} else if genreSet["sci-fi"] || genreSet["fantasy"] {
		return "Dark sci-fi atmosphere, dystopian landscapes, futuristic tension,"
	} else if genreSet["biography"] || genreSet["drama"] {
		return "Intense drama atmosphere, emotional confrontation, raw human tension,"
	} else if genreSet["animation"] || genreSet["comedy"] {
		return "Vibrant energetic atmosphere, bold character expressions, dynamic action,"
	}
	return "Intense cinematic atmosphere, dramatic tension, emotional depth,"
}

func genreMoodScene(desc, genres string) string {
	if desc == "" {
		return fmt.Sprintf("Scenes capture the essence of %s genre.", genres)
	}
	return fmt.Sprintf("Story essence: %s", desc)
}
