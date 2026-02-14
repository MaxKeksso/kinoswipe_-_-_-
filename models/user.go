package models

import (
	"time"

	"github.com/google/uuid"
)

// UserType определяет тип пользователя
type UserType string

const (
	UserTypeRegular UserType = "regular"
	UserTypeHost    UserType = "host"
	UserTypeAdmin   UserType = "admin"
)

// User представляет пользователя приложения
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email,omitempty" db:"email"`
	Phone        string    `json:"phone,omitempty" db:"phone"`
	Username     string    `json:"username" db:"username"`
	AvatarURL    string    `json:"avatar_url,omitempty" db:"avatar_url"`
	PasswordHash string    `json:"-" db:"password_hash"` // Не возвращаем в JSON
	UserType     UserType  `json:"user_type" db:"user_type"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// UserProfile представляет профиль пользователя с дополнительной информацией
type UserProfile struct {
	User
	LikedMoviesCount int `json:"liked_movies_count"`
	MatchesCount     int `json:"matches_count"`
	RoomsCount       int `json:"rooms_count"`
}

// CreateUserRequest представляет запрос на создание пользователя
type CreateUserRequest struct {
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone,omitempty"`
	Username string `json:"username" binding:"required"`
}

// UpdateUserRequest представляет запрос на обновление пользователя
type UpdateUserRequest struct {
	Username  string `json:"username,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

