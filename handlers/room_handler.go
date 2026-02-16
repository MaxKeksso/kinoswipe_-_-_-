package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type RoomHandler struct {
	roomRepo   *repository.RoomRepository
	filterRepo *repository.FilterRepository
}

func NewRoomHandler(roomRepo *repository.RoomRepository, filterRepo *repository.FilterRepository) *RoomHandler {
	return &RoomHandler{
		roomRepo:   roomRepo,
		filterRepo: filterRepo,
	}
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var req models.CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	hostID, ok := RequireUserID(w, r)
	if !ok {
		return
	}

	room := &models.Room{
		ID:       uuid.New(),
		Code:     generateRoomCode(),
		HostID:   hostID,
		Status:   models.RoomStatusWaiting,
		FilterID: req.FilterID,
	}

	if err := h.roomRepo.Create(room); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create room")
		return
	}

	respondWithJSON(w, http.StatusCreated, room)
}

func (h *RoomHandler) GetRoomByCode(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	code := vars["code"]
	if code == "" {
		respondWithError(w, http.StatusBadRequest, "Room code required")
		return
	}

	room, err := h.roomRepo.GetByCode(code)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Room not found")
		return
	}

	respondWithJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) JoinRoom(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	code := vars["code"]
	if code == "" {
		respondWithError(w, http.StatusBadRequest, "Room code required")
		return
	}

	userID, ok := RequireUserID(w, r)
	if !ok {
		return
	}

	// Получаем комнату по коду
	room, err := h.roomRepo.GetByCode(code)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Room not found")
		return
	}

	// Добавляем пользователя в комнату
	if err := h.roomRepo.AddMember(room.ID, userID); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to join room")
		return
	}

	// Возвращаем комнату и актуальный список участников (чтобы клиент сразу видел себя и остальных)
	members, _ := h.roomRepo.GetMembers(room.ID)
	resp := models.JoinRoomResponse{Room: *room, Members: members}
	respondWithJSON(w, http.StatusOK, resp)
}

func (h *RoomHandler) GetAllRooms(w http.ResponseWriter, r *http.Request) {
	statusStr := r.URL.Query().Get("status")
	limit := 50 // По умолчанию
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	var status *models.RoomStatus
	if statusStr != "" {
		roomStatus := models.RoomStatus(statusStr)
		status = &roomStatus
	}

	rooms, err := h.roomRepo.GetAll(status, limit)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get rooms")
		return
	}

	respondWithJSON(w, http.StatusOK, rooms)
}

func (h *RoomHandler) StartRoom(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	userID, ok := RequireUserID(w, r)
	if !ok {
		return
	}

	// Получаем комнату
	room, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Room not found")
		return
	}

	// Проверяем, что пользователь является хостом комнаты
	if room.HostID != userID {
		respondWithError(w, http.StatusForbidden, "Only room host can start the room")
		return
	}

	// Проверяем, что комната в статусе waiting
	if room.Status != models.RoomStatusWaiting {
		respondWithError(w, http.StatusBadRequest, "Room is already started or finished")
		return
	}

	// Меняем статус на active
	room.Status = models.RoomStatusActive
	if err := h.roomRepo.UpdateStatus(roomID, models.RoomStatusActive); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to start room")
		return
	}

	respondWithJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) GetRoomMembers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	members, err := h.roomRepo.GetMembers(roomID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get room members")
		return
	}

	// Если участников нет — восстанавливаем хоста в room_members (на случай сбоя при создании)
	if len(members) == 0 {
		room, getErr := h.roomRepo.GetByID(roomID)
		if getErr == nil {
			_ = h.roomRepo.AddMember(roomID, room.HostID)
			members, _ = h.roomRepo.GetMembers(roomID)
		}
	}

	respondWithJSON(w, http.StatusOK, members)
}

// Генерация читаемого 6-символьного кода комнаты
func generateRoomCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	rand.Seed(time.Now().UnixNano())
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}
