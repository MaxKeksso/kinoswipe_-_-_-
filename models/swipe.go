package models

import (
	"time"

	"github.com/google/uuid"
)

// SwipeDirection определяет направление свайпа
type SwipeDirection string

const (
	SwipeDirectionLeft  SwipeDirection = "left"  // Не нравится
	SwipeDirectionRight SwipeDirection = "right" // Нравится
)

// Swipe представляет действие пользователя (свайп)
type Swipe struct {
	ID        uuid.UUID     `json:"id" db:"id"`
	UserID    uuid.UUID     `json:"user_id" db:"user_id"`
	RoomID    uuid.UUID     `json:"room_id" db:"room_id"`
	MovieID   uuid.UUID     `json:"movie_id" db:"movie_id"`
	Direction SwipeDirection `json:"direction" db:"direction"`
	CreatedAt time.Time     `json:"created_at" db:"created_at"`
}

// CreateSwipeRequest представляет запрос на создание свайпа
type CreateSwipeRequest struct {
	MovieID   uuid.UUID     `json:"movie_id" binding:"required"`
	Direction SwipeDirection `json:"direction" binding:"required,oneof=left right"`
}

// UndoSwipeRequest представляет запрос на отмену последнего свайпа
type UndoSwipeRequest struct {
	RoomID uuid.UUID `json:"room_id" binding:"required"`
}

// SwipeWithMovie представляет свайп с информацией о фильме
type SwipeWithMovie struct {
	Swipe
	Movie Movie `json:"movie"`
}

