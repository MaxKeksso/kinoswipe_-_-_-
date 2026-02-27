// Импорт топ-100 фильмов по рейтингу IMDB из CSV.
// ВНИМАНИЕ: ОЧИЩАЕТ таблицу movies перед импортом!
// Использование:
//
//	go run ./cmd/import_top100 [путь_к_csv]
//
// По умолчанию: imdb_top_1000.csv в текущей директории.
package main

import (
	"encoding/csv"
	"encoding/json"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"

	"kinoswipe/config"
	"kinoswipe/database"

	"github.com/google/uuid"
)

type movieRow struct {
	title       string
	year        int
	imdbRating  float64
	genre       string // JSON array
	duration    int
	description string
	posterURL   string
}

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
		log.Fatalf("Open CSV: %v", err)
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
			if strings.EqualFold(strings.TrimSpace(h), name) {
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
		log.Fatal("Колонка Series_Title не найдена")
	}

	// Парсим все строки
	var all []movieRow
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		title := strings.TrimSpace(get(row, idxTitle))
		if title == "" {
			continue
		}
		year := 0
		if idxYear >= 0 {
			year, _ = strconv.Atoi(strings.TrimSpace(get(row, idxYear)))
		}
		var rating float64
		if idxRating >= 0 {
			s := strings.TrimSpace(get(row, idxRating))
			rating, _ = strconv.ParseFloat(s, 64)
		}
		genreJSON := "[]"
		if idxGenre >= 0 {
			s := stripCtrl(strings.TrimSpace(get(row, idxGenre)))
			if s != "" {
				parts := strings.Split(s, ",")
				for j := range parts {
					parts[j] = strings.TrimSpace(stripCtrl(parts[j]))
				}
				if b, err := json.Marshal(parts); err == nil {
					genreJSON = string(b)
				}
			}
		}
		duration := 0
		if idxRuntime >= 0 {
			for _, c := range get(row, idxRuntime) {
				if c >= '0' && c <= '9' {
					duration = duration*10 + int(c-'0')
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

		all = append(all, movieRow{
			title:       title,
			year:        year,
			imdbRating:  rating,
			genre:       genreJSON,
			duration:    duration,
			description: description,
			posterURL:   posterURL,
		})
	}

	// Сортируем по рейтингу убывающе
	sort.Slice(all, func(i, j int) bool {
		return all[i].imdbRating > all[j].imdbRating
	})

	// Берём топ-100
	top := all
	if len(top) > 100 {
		top = top[:100]
	}
	log.Printf("Из %d фильмов берём топ-%d по IMDB рейтингу", len(all), len(top))
	log.Printf("Диапазон рейтингов: %.1f – %.1f", top[len(top)-1].imdbRating, top[0].imdbRating)

	// Очищаем таблицу
	if _, err := db.DB.Exec("TRUNCATE TABLE movies CASCADE"); err != nil {
		log.Fatalf("TRUNCATE movies: %v", err)
	}
	log.Println("Таблица movies очищена")

	// Вставляем топ-100
	stmt, err := db.DB.Prepare(`
		INSERT INTO movies (id, title, poster_url, imdb_rating, genre, year, duration, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`)
	if err != nil {
		log.Fatalf("Prepare: %v", err)
	}
	defer stmt.Close()

	inserted := 0
	for _, m := range top {
		genreBytes := []byte(m.genre)
		if !json.Valid(genreBytes) {
			genreBytes = []byte("[]")
		}
		var rating *float64
		if m.imdbRating > 0 {
			v := m.imdbRating
			rating = &v
		}
		if _, err := stmt.Exec(
			uuid.New(),
			m.title,
			m.posterURL,
			rating,
			genreBytes,
			m.year,
			m.duration,
			m.description,
		); err != nil {
			log.Printf("Ошибка вставки %q: %v", m.title, err)
			continue
		}
		log.Printf("[%d] %.1f  %s (%d)", inserted+1, m.imdbRating, m.title, m.year)
		inserted++
	}
	log.Printf("\nГотово. Вставлено: %d фильмов", inserted)
}

func get(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return row[i]
}

func stripCtrl(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= 32 && r != 127 {
			b.WriteRune(r)
		}
	}
	return b.String()
}
