package handlers

import (
	"encoding/json"
	"net/http"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type FeedbackHandler struct {
	feedbackRepo *repository.FeedbackRepository
}

func NewFeedbackHandler(feedbackRepo *repository.FeedbackRepository) *FeedbackHandler {
	return &FeedbackHandler{feedbackRepo: feedbackRepo}
}

func (h *FeedbackHandler) CreateFeedback(w http.ResponseWriter, r *http.Request) {
	var req models.CreateFeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Получаем userID (опционально) из JWT или X-User-ID
	var userID *uuid.UUID
	if id, ok := UserIDFromRequest(r); ok {
		userID = &id
	}

	feedback := &models.Feedback{
		ID:           uuid.New(),
		UserID:       userID,
		RoomID:       req.RoomID,
		MatchID:      req.MatchID,
		TimeSpent:    req.TimeSpent,
		HadArguments: req.HadArguments,
		Rating:       req.Rating,
		Comment:      req.Comment,
	}

	if err := h.feedbackRepo.Create(feedback); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create feedback")
		return
	}

	respondWithJSON(w, http.StatusCreated, feedback)
}

func (h *FeedbackHandler) GetFeedback(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	feedbackID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid feedback ID")
		return
	}

	feedback, err := h.feedbackRepo.GetByID(feedbackID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Feedback not found")
		return
	}

	respondWithJSON(w, http.StatusOK, feedback)
}

func (h *FeedbackHandler) GetRoomFeedbacks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	feedbacks, err := h.feedbackRepo.GetByRoomID(roomID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get feedbacks")
		return
	}

	respondWithJSON(w, http.StatusOK, feedbacks)
}

