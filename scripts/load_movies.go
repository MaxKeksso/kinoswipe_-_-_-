//go:build loadmovies

package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load() // загружаем .env из корня проекта
	// Подключение к базе данных: из .env (DATABASE_URL) или значения по умолчанию
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://kinoswipe:kinoswipe123@localhost:5433/kinoswipe?sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("✅ Connected to database")

	// Популярные фильмы
	movies := []map[string]interface{}{
		{"title": "Матрица", "title_en": "The Matrix", "poster": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", "imdb": 8.7, "kp": 8.5, "genre": []string{"фантастика", "боевик"}, "year": 1999, "duration": 136, "desc": "Хакер Нео узнает, что его реальность - это иллюзия, созданная машинами."},
		{"title": "Интерстеллар", "title_en": "Interstellar", "poster": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", "imdb": 8.6, "kp": 8.6, "genre": []string{"фантастика", "драма"}, "year": 2014, "duration": 169, "desc": "Исследователи отправляются в космос, чтобы найти новый дом для человечества."},
		{"title": "Начало", "title_en": "Inception", "poster": "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "imdb": 8.8, "kp": 8.7, "genre": []string{"фантастика", "триллер"}, "year": 2010, "duration": 148, "desc": "Профессионал по проникновению в сны получает задание внедрить идею."},
		{"title": "Криминальное чтиво", "title_en": "Pulp Fiction", "poster": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "imdb": 8.9, "kp": 8.6, "genre": []string{"криминал", "драма"}, "year": 1994, "duration": 154, "desc": "Переплетенные истории криминального мира Лос-Анджелеса."},
		{"title": "Побег из Шоушенка", "title_en": "The Shawshank Redemption", "poster": "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", "imdb": 9.3, "kp": 9.1, "genre": []string{"драма"}, "year": 1994, "duration": 142, "desc": "Банкир приговорен к пожизненному заключению за убийство жены."},
	}

	// Добавляем больше фильмов для достижения 200-300
	// Для демонстрации создам базовый список, который можно расширить

	query := `
		INSERT INTO movies (id, title, title_en, poster_url, imdb_rating, kp_rating, genre, year, duration, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO NOTHING
	`

	count := 0
	for _, movieData := range movies {
		movieID := uuid.New()
		genreJSON, _ := json.Marshal(movieData["genre"])
		imdb := movieData["imdb"].(float64)
		kp := movieData["kp"].(float64)

		_, err := db.Exec(query,
			movieID,
			movieData["title"],
			movieData["title_en"],
			movieData["poster"],
			imdb,
			kp,
			string(genreJSON),
			movieData["year"],
			movieData["duration"],
			movieData["desc"],
		)

		if err != nil {
			log.Printf("Error inserting movie %s: %v", movieData["title"], err)
			continue
		}

		count++
		fmt.Printf("✅ Inserted: %s\n", movieData["title"])
	}

	fmt.Printf("\n✅ Successfully inserted %d movies\n", count)
}
