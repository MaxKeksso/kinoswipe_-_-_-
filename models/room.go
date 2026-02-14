package models

import (
	"time"

	"github.com/google/uuid"
)

// RoomStatus определяет статус комнаты
type RoomStatus string

const (
	RoomStatusWaiting  RoomStatus = "waiting"  // Ожидание участников
	RoomStatusActive   RoomStatus = "active"   // Активный сеанс
	RoomStatusFinished RoomStatus = "finished" // Сеанс завершен
)

// Room представляет виртуальную комнату для совместного выбора фильмов
type Room struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	Code      string     `json:"code" db:"code"`           // Уникальный код комнаты
	HostID    uuid.UUID  `json:"host_id" db:"host_id"`     // ID создателя комнаты
	Status    RoomStatus `json:"status" db:"status"`
	FilterID  *uuid.UUID `json:"filter_id,omitempty" db:"filter_id"` // Опциональный фильтр
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

// RoomWithDetails представляет комнату с дополнительной информацией
type RoomWithDetails struct {
	Room
	Host     User    `json:"host"`
	Filter   *Filter `json:"filter,omitempty"`
	Members  []User  `json:"members"`
	Matches  []Match `json:"matches,omitempty"`
	MatchCount int   `json:"match_count"`
}

// CreateRoomRequest представляет запрос на создание комнаты
type CreateRoomRequest struct {
	FilterID *uuid.UUID `json:"filter_id,omitempty"`
}

// JoinRoomRequest представляет запрос на присоединение к комнате
type JoinRoomRequest struct {
	Code string `json:"code" binding:"required"`
}

// JoinRoomResponse — ответ при присоединении к комнате (комната + список участников)
type JoinRoomResponse struct {
	Room    Room   `json:"room"`
	Members []User `json:"members"`
}

// RoomMember представляет связь пользователя с комнатой
type RoomMember struct {
	RoomID   uuid.UUID `json:"room_id" db:"room_id"`
	UserID   uuid.UUID `json:"user_id" db:"user_id"`
	JoinedAt time.Time `json:"joined_at" db:"joined_at"`
}

