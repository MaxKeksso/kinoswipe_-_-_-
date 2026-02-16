package handlers

import (
	"encoding/json"
	"net/http"

	"kinoswipe/models"
	"kinoswipe/repository"
	"kinoswipe/service"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type SwipeHandler struct {
	swipeRepo   *repository.SwipeRepository
	matchService *service.MatchService
}

func NewSwipeHandler(swipeRepo *repository.SwipeRepository, matchService *service.MatchService) *SwipeHandler {
	return &SwipeHandler{
		swipeRepo:   swipeRepo,
		matchService: matchService,
	}
}

func (h *SwipeHandler) CreateSwipe(w http.ResponseWriter, r *http.Request) {
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

	var req models.CreateSwipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Проверяем, не свайпал ли уже пользователь этот фильм
	hasSwiped, err := h.swipeRepo.HasUserSwiped(userID, roomID, req.MovieID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to check swipe")
		return
	}

	if hasSwiped {
		respondWithError(w, http.StatusConflict, "Already swiped this movie")
		return
	}

	swipe := &models.Swipe{
		ID:        uuid.New(),
		UserID:    userID,
		RoomID:    roomID,
		MovieID:   req.MovieID,
		Direction: req.Direction,
	}

	if err := h.swipeRepo.Create(swipe); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create swipe")
		return
	}

	// Если это лайк, проверяем возможность создания матча
	if req.Direction == models.SwipeDirectionRight {
		match, err := h.matchService.CheckAndCreateMatch(roomID, req.MovieID)
		if err != nil {
			// Логируем ошибку, но не прерываем ответ
			// В production лучше использовать логгер
		}

		if match != nil {
			// Возвращаем информацию о матче в ответе
			matchDetails, err := h.matchService.GetMatchWithDetails(match.ID)
			if err == nil {
				response := map[string]interface{}{
					"swipe": swipe,
					"match": matchDetails,
				}
				respondWithJSON(w, http.StatusOK, response)
				return
			}
		}
	}

	respondWithJSON(w, http.StatusOK, swipe)
}

func (h *SwipeHandler) UndoSwipe(w http.ResponseWriter, r *http.Request) {
	// Получаем userID
	userID, ok := RequireUserID(w, r)
	if !ok {
		return
	}

	var req models.UndoSwipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Получаем последний свайп пользователя в этой комнате
	lastSwipe, err := h.swipeRepo.GetLastSwipe(userID, req.RoomID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "No swipe found to undo")
		return
	}

	// Удаляем свайп
	if err := h.swipeRepo.Delete(lastSwipe.ID); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to undo swipe")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Swipe undone successfully"})
}

func (h *SwipeHandler) GetUserSwipes(w http.ResponseWriter, r *http.Request) {
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

	swipes, err := h.swipeRepo.GetUserSwipes(userID, roomID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get swipes")
		return
	}

	respondWithJSON(w, http.StatusOK, swipes)
}

