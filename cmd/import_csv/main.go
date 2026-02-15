// Импорт фильмов из CSV (например imdb_top_1000.csv) в таблицу movies.
// Использование:
//   go run ./cmd/import_csv [путь_к_csv]
//   По умолчанию: imdb_top_1000.csv в текущей директории.
// Требуется .env с DATABASE_URL или переменные DB_* (как в основном приложении).
package main

import (
	"encoding/csv"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"strings"

	"kinoswipe/config"
	"kinoswipe/database"
	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
)

func main() {
	csvPath := "imdb_top_1000.csv"
	if len(os.Args) > 1 && os.Args[1] != "" {
		csvPath = os.Args[1]
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

	f, err := os.Open(csvPath)
	if err != nil {
		log.Fatalf("Open CSV: %v (положите файл в корень проекта или укажите путь)", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	rows, err := r.ReadAll()
	if err != nil {
		log.Fatalf("Read CSV: %v", err)
	}
	if len(rows) < 2 {
		log.Fatal("CSV пустой или только заголовок")
	}

	header := rows[0]
	col := func(name string) int {
		for i, h := range header {
			if strings.TrimSpace(strings.ToLower(h)) == strings.ToLower(name) {
				return i
			}
		}
		return -1
	}
	idxTitle := col("Series_Title")
	idxYear := col("Released_Year")
	idxRating := col("IMDB_Rating")
	idxGenre := col("Genre")
	idxRuntime := col("Runtime")
	idxOverview := col("Overview")
	idxPoster := col("Poster_Link")

	if idxTitle < 0 {
		log.Fatal("В CSV не найдена колонка Series_Title. Проверьте заголовки.")
	}

	repo := repository.NewMovieRepository(db.DB)
	inserted := 0
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if len(row) <= idxTitle {
			continue
		}
		title := strings.TrimSpace(get(row, idxTitle))
		if title == "" {
			continue
		}

		year := 0
		if idxYear >= 0 {
			year, _ = strconv.Atoi(strings.TrimSpace(get(row, idxYear)))
		}
		var imdbRating *float64
		if idxRating >= 0 {
			s := strings.TrimSpace(get(row, idxRating))
			if s != "" {
				if v, err := strconv.ParseFloat(s, 64); err == nil {
					imdbRating = &v
				}
			}
		}
		genreJSON := "[]"
		if idxGenre >= 0 {
			s := strings.TrimSpace(get(row, idxGenre))
			s = stripControlChars(s)
			if s != "" {
				parts := strings.Split(s, ",")
				for j := range parts {
					parts[j] = strings.TrimSpace(stripControlChars(parts[j]))
				}
				if b, err := json.Marshal(parts); err == nil && json.Valid(b) {
					genreJSON = string(b)
				}
			}
		}
		duration := 0
		if idxRuntime >= 0 {
			s := strings.TrimSpace(get(row, idxRuntime))
			for _, r := range s {
				if r >= '0' && r <= '9' {
					duration = duration*10 + int(r-'0')
				}
			}
		}
		description := ""
		if idxOverview >= 0 {
			description = strings.TrimSpace(get(row, idxOverview))
		}
		posterURL := ""
		if idxPoster >= 0 {
			posterURL = strings.TrimSpace(get(row, idxPoster))
		}

		movie := &models.Movie{
			ID:          uuid.New(),
			Title:       title,
			PosterURL:   posterURL,
			IMDbRating:  imdbRating,
			Genre:       genreJSON,
			Year:        year,
			Duration:    duration,
			Description: description,
		}
		if err := repo.Create(movie); err != nil {
			log.Printf("Строка %d (%q): %v", i+1, title, err)
			continue
		}
		inserted++
		if inserted%100 == 0 {
			log.Printf("Вставлено %d записей...", inserted)
		}
	}
	log.Printf("Готово. Вставлено фильмов: %d", inserted)
}

func get(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return row[i]
}

// stripControlChars убирает управляющие символы (0–31, 127), которые ломают JSON
func stripControlChars(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= 32 && r != 127 {
			b.WriteRune(r)
		}
	}
	return b.String()
}
