package models

import (
	"time"

	"github.com/google/uuid"
)

// Match представляет совпадение (когда все участники лайкнули фильм)
type Match struct {
	ID        uuid.UUID `json:"id" db:"id"`
	RoomID    uuid.UUID `json:"room_id" db:"room_id"`
	MovieID   uuid.UUID `json:"movie_id" db:"movie_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// MatchWithDetails представляет матч с дополнительной информацией
type MatchWithDetails struct {
	Match
	Movie Movie   `json:"movie"`
	Room  Room    `json:"room"`
	Users []User  `json:"users"` // Пользователи, которые лайкнули фильм
}

// MatchNotification представляет уведомление о матче для WebSocket
type MatchNotification struct {
	Type      string         `json:"type"` // "match"
	Match     MatchWithDetails `json:"match"`
	Timestamp time.Time      `json:"timestamp"`
}

