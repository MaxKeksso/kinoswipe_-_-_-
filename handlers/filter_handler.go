package handlers

import (
	"encoding/json"
	"net/http"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type FilterHandler struct {
	filterRepo *repository.FilterRepository
	roomRepo   *repository.RoomRepository
}

func NewFilterHandler(filterRepo *repository.FilterRepository, roomRepo *repository.RoomRepository) *FilterHandler {
	return &FilterHandler{
		filterRepo: filterRepo,
		roomRepo:   roomRepo,
	}
}

func (h *FilterHandler) CreateFilter(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	var req models.CreateFilterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Преобразуем жанры в JSON
	genresJSON := repository.GenresToJSON(req.Genres)

	filter := &models.Filter{
		ID:          uuid.New(),
		RoomID:      &roomID,
		Genres:      genresJSON,
		YearFrom:    req.YearFrom,
		YearTo:      req.YearTo,
		DurationMin: req.DurationMin,
		DurationMax: req.DurationMax,
		MinRating:   req.MinRating,
		Mood:        req.Mood,
	}

	if err := h.filterRepo.Create(filter); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create filter")
		return
	}

	// Обновляем комнату, чтобы она использовала этот фильтр
	room, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Room not found")
		return
	}

	room.FilterID = &filter.ID
	// Здесь нужно обновить комнату в БД, но для упрощения оставляем как есть
	// В production нужно добавить метод Update в RoomRepository

	respondWithJSON(w, http.StatusCreated, filter)
}

func (h *FilterHandler) GetFilter(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	filterID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid filter ID")
		return
	}

	filter, err := h.filterRepo.GetByID(filterID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Filter not found")
		return
	}

	respondWithJSON(w, http.StatusOK, filter)
}

func (h *FilterHandler) GetRoomFilter(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	filter, err := h.filterRepo.GetByRoomID(roomID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Filter not found")
		return
	}

	respondWithJSON(w, http.StatusOK, filter)
}

