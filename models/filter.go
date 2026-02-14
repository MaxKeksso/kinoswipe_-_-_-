package models

import (
	"time"

	"github.com/google/uuid"
)

// Filter представляет параметры фильтрации для сужения списка фильмов
type Filter struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	RoomID      *uuid.UUID `json:"room_id,omitempty" db:"room_id"`
	Genres      string     `json:"genres,omitempty" db:"genres"`       // JSON массив жанров
	YearFrom    *int       `json:"year_from,omitempty" db:"year_from"`
	YearTo      *int       `json:"year_to,omitempty" db:"year_to"`
	DurationMin *int       `json:"duration_min,omitempty" db:"duration_min"`
	DurationMax *int       `json:"duration_max,omitempty" db:"duration_max"`
	MinRating   *float64   `json:"min_rating,omitempty" db:"min_rating"` // Минимальный рейтинг (IMDb или КП)
	Mood        string     `json:"mood,omitempty" db:"mood"`             // Настроение (романтика, комедия и т.д.)
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateFilterRequest представляет запрос на создание фильтра
type CreateFilterRequest struct {
	Genres      []string  `json:"genres,omitempty"`
	YearFrom    *int      `json:"year_from,omitempty"`
	YearTo      *int      `json:"year_to,omitempty"`
	DurationMin *int      `json:"duration_min,omitempty"`
	DurationMax *int      `json:"duration_max,omitempty"`
	MinRating   *float64  `json:"min_rating,omitempty"`
	Mood        string    `json:"mood,omitempty"`
}

