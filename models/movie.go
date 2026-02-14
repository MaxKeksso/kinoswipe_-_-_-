package models

import (
	"time"

	"github.com/google/uuid"
)

// Movie представляет карточку фильма
type Movie struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Title       string     `json:"title" db:"title"`
	TitleEn     string     `json:"title_en,omitempty" db:"title_en"`
	PosterURL   string     `json:"poster_url" db:"poster_url"`
	IMDbRating  *float64   `json:"imdb_rating,omitempty" db:"imdb_rating"`
	KPRating    *float64   `json:"kp_rating,omitempty" db:"kp_rating"`
	Genre       string     `json:"genre" db:"genre"` // JSON массив жанров
	Year        int        `json:"year" db:"year"`
	Duration    int        `json:"duration" db:"duration"` // в минутах
	Description string     `json:"description,omitempty" db:"description"`
	TrailerURL  string     `json:"trailer_url,omitempty" db:"trailer_url"`
	StreamingURL string    `json:"streaming_url,omitempty" db:"streaming_url"` // JSON массив ссылок
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// MovieCard представляет упрощенную карточку для отображения
type MovieCard struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	PosterURL  string    `json:"poster_url"`
	IMDbRating *float64  `json:"imdb_rating,omitempty"`
	KPRating   *float64  `json:"kp_rating,omitempty"`
	Genre      string    `json:"genre"`
	Year       int       `json:"year"`
	Duration   int       `json:"duration"`
}

