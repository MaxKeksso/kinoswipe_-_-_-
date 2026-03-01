package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"kinoswipe/config"
	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// В production нужно проверять origin
		return true
	},
}

type Hub struct {
	rooms      map[uuid.UUID]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
	mu         sync.RWMutex
	// опционально: для извлечения user_id из JWT в query token=
	userRepo *repository.UserRepository
	cfg      *config.Config
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	roomID uuid.UUID
	userID uuid.UUID
}

type Message struct {
	RoomID  uuid.UUID
	UserID  uuid.UUID
	Message []byte
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[uuid.UUID]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *Message),
	}
}

// SetAuth задаёт репозиторий и конфиг для авторизации WebSocket по JWT (query token=).
func (h *Hub) SetAuth(userRepo *repository.UserRepository, cfg *config.Config) {
	h.userRepo = userRepo
	h.cfg = cfg
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.roomID] == nil {
				h.rooms[client.roomID] = make(map[*Client]bool)
			}
			h.rooms[client.roomID][client] = true
			h.mu.Unlock()

			// Отправляем уведомление о присоединении
			joinMsg := models.JoinNotification{
				Type:      models.WSMessageTypeJoin,
				UserID:    client.userID.String(),
				Username:  "", // Можно добавить получение username из репозитория
				Timestamp: time.Now().Unix(),
			}
			h.broadcastToRoom(client.roomID, joinMsg)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.rooms[client.roomID]; ok {
				delete(h.rooms[client.roomID], client)
				close(client.send)
				if len(h.rooms[client.roomID]) == 0 {
					delete(h.rooms, client.roomID)
				}
			}
			h.mu.Unlock()

			// Отправляем уведомление об уходе
			leaveMsg := models.JoinNotification{
				Type:      models.WSMessageTypeLeave,
				UserID:    client.userID.String(),
				Timestamp: time.Now().Unix(),
			}
			h.broadcastToRoom(client.roomID, leaveMsg)

		case message := <-h.broadcast:
			// Message уже содержит данные для отправки
			h.mu.RLock()
			clients, ok := h.rooms[message.RoomID]
			if !ok {
				h.mu.RUnlock()
				continue
			}
			clientsCopy := make([]*Client, 0, len(clients))
			for client := range clients {
				clientsCopy = append(clientsCopy, client)
			}
			h.mu.RUnlock()

			for _, client := range clientsCopy {
				select {
				case client.send <- message.Message:
				default:
					h.mu.Lock()
					if h.rooms[message.RoomID] != nil {
						delete(h.rooms[message.RoomID], client)
					}
					h.mu.Unlock()
					close(client.send)
				}
			}
		}
	}
}

func (h *Hub) broadcastToRoom(roomID uuid.UUID, message interface{}) {
	h.mu.RLock()
	clients, ok := h.rooms[roomID]
	if !ok {
		h.mu.RUnlock()
		return
	}

	// Создаем копию клиентов для безопасной итерации
	clientsCopy := make([]*Client, 0, len(clients))
	for client := range clients {
		clientsCopy = append(clientsCopy, client)
	}
	h.mu.RUnlock()

	data, err := json.Marshal(models.WebSocketMessage{
		Type:      "broadcast",
		Payload:   message,
		Timestamp: time.Now().Unix(),
	})
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	for _, client := range clientsCopy {
		select {
		case client.send <- data:
		default:
			h.mu.Lock()
			if h.rooms[roomID] != nil {
				delete(h.rooms[roomID], client)
			}
			h.mu.Unlock()
			close(client.send)
		}
	}
}

// BroadcastMatch отправляет матч напрямую всем в комнате с type="match" на верхнем уровне.
// Не оборачивает в broadcastToRoom чтобы фронтенд получал правильный формат.
func (h *Hub) BroadcastMatch(roomID uuid.UUID, match *models.MatchWithDetails) {
	msg := map[string]interface{}{
		"type":      models.WSMessageTypeMatch,
		"match":     match,
		"timestamp": time.Now().Unix(),
	}
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling match notification: %v", err)
		return
	}

	h.mu.RLock()
	clients, ok := h.rooms[roomID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	clientsCopy := make([]*Client, 0, len(clients))
	for client := range clients {
		clientsCopy = append(clientsCopy, client)
	}
	h.mu.RUnlock()

	for _, client := range clientsCopy {
		select {
		case client.send <- data:
		default:
			h.mu.Lock()
			if h.rooms[roomID] != nil {
				delete(h.rooms[roomID], client)
			}
			h.mu.Unlock()
			close(client.send)
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Обрабатываем входящие сообщения (ping/pong, etc.)
		var wsMsg models.WebSocketMessage
		if err := json.Unmarshal(message, &wsMsg); err == nil {
			if wsMsg.Type == models.WSMessageTypePing {
				pong := models.WebSocketMessage{
					Type:      models.WSMessageTypePong,
					Timestamp: time.Now().Unix(),
				}
				data, _ := json.Marshal(pong)
				c.send <- data
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("WebSocket handler panic (room=%s): %v", r.URL.Path, rec)
		}
	}()
	vars := mux.Vars(r)
	roomIDStr := vars["room_id"]
	if roomIDStr == "" {
		respondWithError(w, http.StatusBadRequest, "Room ID required")
		return
	}
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	// userID: сначала из JWT (query token=), затем user_id или X-User-ID
	var userID uuid.UUID
	if tokenStr := r.URL.Query().Get("token"); tokenStr != "" && h.userRepo != nil && h.cfg != nil {
		claims := &jwt.MapClaims{}
		token, errJWT := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(h.cfg.JWT.Secret), nil
		})
		if errJWT == nil && token.Valid {
			if sub, ok := (*claims)["sub"].(string); ok {
				if uid, errParse := uuid.Parse(sub); errParse == nil {
					userID = uid
				}
			}
		}
	}
	if userID == uuid.Nil {
		userIDStr := r.URL.Query().Get("user_id")
		if userIDStr == "" {
			userIDStr = r.Header.Get("X-User-ID")
		}
		if userIDStr == "" {
			respondWithError(w, http.StatusUnauthorized, "User ID required")
			return
		}
		var errParse error
		userID, errParse = uuid.Parse(userIDStr)
		if errParse != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error (room=%s): %v", roomIDStr, err)
		// Upgrade может уже отправить ответ — не пишем в w повторно
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		roomID: roomID,
		userID: userID,
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

