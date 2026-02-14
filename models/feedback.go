package models

import (
	"time"

	"github.com/google/uuid"
)

// Feedback представляет обратную связь от пользователя
type Feedback struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	UserID          *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	RoomID          *uuid.UUID `json:"room_id,omitempty" db:"room_id"`
	MatchID         *uuid.UUID `json:"match_id,omitempty" db:"match_id"`
	TimeSpent       *int       `json:"time_spent,omitempty" db:"time_spent"` // В минутах
	HadArguments    bool       `json:"had_arguments" db:"had_arguments"`
	Rating          int        `json:"rating" db:"rating"` // 1-5
	Comment         string     `json:"comment,omitempty" db:"comment"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

// CreateFeedbackRequest представляет запрос на создание обратной связи
type CreateFeedbackRequest struct {
	RoomID       *uuid.UUID `json:"room_id,omitempty"`
	MatchID      *uuid.UUID `json:"match_id,omitempty"`
	TimeSpent    *int       `json:"time_spent,omitempty"`
	HadArguments bool       `json:"had_arguments"`
	Rating       int        `json:"rating" binding:"required,min=1,max=5"`
	Comment      string     `json:"comment,omitempty"`
}

