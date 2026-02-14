package models

import (
	"time"

	"github.com/google/uuid"
)

// Premiere представляет премьеру фильма
type Premiere struct {
	ID          uuid.UUID `json:"id" db:"id"`
	MovieID     uuid.UUID `json:"movie_id" db:"movie_id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	PosterURL   string    `json:"poster_url" db:"poster_url"`
	ReleaseDate time.Time `json:"release_date" db:"release_date"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	Position    string    `json:"position" db:"position"` // "left" или "right"
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	Movie       *Movie    `json:"movie,omitempty"`
}

// CreatePremiereRequest представляет запрос на создание премьеры
type CreatePremiereRequest struct {
	MovieID     string `json:"movie_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	PosterURL   string `json:"poster_url"`
	ReleaseDate string `json:"release_date"`
	Position    string `json:"position"` // "left" или "right"
}

// UpdatePremiereRequest представляет запрос на обновление премьеры
type UpdatePremiereRequest struct {
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	PosterURL   string `json:"poster_url,omitempty"`
	ReleaseDate string `json:"release_date,omitempty"`
	IsActive    *bool  `json:"is_active,omitempty"`
	Position    string `json:"position,omitempty"`
}
