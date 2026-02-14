package models

// LoginRequest представляет запрос на вход
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest представляет запрос на регистрацию
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone,omitempty"`
}

// AuthResponse представляет ответ на авторизацию
type AuthResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token,omitempty"` // Для будущей JWT авторизации
}
