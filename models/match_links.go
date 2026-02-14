package models

import (
	"time"

	"github.com/google/uuid"
)

// MatchLink представляет ссылку для просмотра фильма после матча
type MatchLink struct {
	ID        uuid.UUID `json:"id" db:"id"`
	MatchID   uuid.UUID `json:"match_id" db:"match_id"`
	Platform  string    `json:"platform" db:"platform"` // "kinopoisk", "start", "okko", "other"
	URL       string    `json:"url" db:"url"`
	Title     string    `json:"title" db:"title"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// CreateMatchLinkRequest представляет запрос на создание ссылки
type CreateMatchLinkRequest struct {
	MatchID  string `json:"match_id"`
	Platform string `json:"platform"`
	URL      string `json:"url"`
	Title    string `json:"title"`
}
