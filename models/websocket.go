package models

// WebSocketMessage представляет общее сообщение для WebSocket
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

// WebSocketMessageType определяет типы сообщений
const (
	WSMessageTypeMatch    = "match"
	WSMessageTypeSwipe    = "swipe"
	WSMessageTypeJoin     = "join"
	WSMessageTypeLeave    = "leave"
	WSMessageTypeError    = "error"
	WSMessageTypePing     = "ping"
	WSMessageTypePong     = "pong"
)

// SwipeNotification представляет уведомление о свайпе
type SwipeNotification struct {
	Type      string `json:"type"`
	UserID    string `json:"user_id"`
	MovieID   string `json:"movie_id"`
	Direction string `json:"direction"`
	Timestamp int64  `json:"timestamp"`
}

// JoinNotification представляет уведомление о присоединении
type JoinNotification struct {
	Type      string `json:"type"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Timestamp int64  `json:"timestamp"`
}

