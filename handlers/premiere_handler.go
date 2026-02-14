package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type PremiereHandler struct {
	premiereRepo *repository.PremiereRepository
}

func NewPremiereHandler(premiereRepo *repository.PremiereRepository) *PremiereHandler {
	return &PremiereHandler{premiereRepo: premiereRepo}
}

func (h *PremiereHandler) GetPremieres(w http.ResponseWriter, r *http.Request) {
	position := r.URL.Query().Get("position")
	var positionPtr *string
	if position != "" && (position == "left" || position == "right") {
		positionPtr = &position
	}

	premieres, err := h.premiereRepo.GetAll(positionPtr)
	if err != nil {
		log.Printf("Error getting premieres: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to get premieres")
		return
	}

	respondWithJSON(w, http.StatusOK, premieres)
}

func (h *PremiereHandler) CreatePremiere(w http.ResponseWriter, r *http.Request) {
	var req models.CreatePremiereRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	premiere := &models.Premiere{
		ID:          uuid.New(),
		Title:       req.Title,
		Description: req.Description,
		PosterURL:   req.PosterURL,
		IsActive:    true,
		Position:    req.Position,
	}

	if req.MovieID != "" {
		movieID, err := uuid.Parse(req.MovieID)
		if err == nil {
			premiere.MovieID = movieID
		}
	}

	if req.ReleaseDate != "" {
		// Парсинг даты (формат: YYYY-MM-DD)
		releaseDate, err := time.Parse("2006-01-02", req.ReleaseDate)
		if err == nil {
			premiere.ReleaseDate = releaseDate
		}
	}

	if err := h.premiereRepo.Create(premiere); err != nil {
		log.Printf("Error creating premiere: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create premiere")
		return
	}

	respondWithJSON(w, http.StatusCreated, premiere)
}

func (h *PremiereHandler) UpdatePremiere(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	premiereID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid premiere ID")
		return
	}

	var req models.UpdatePremiereRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.premiereRepo.Update(premiereID, &req); err != nil {
		log.Printf("Error updating premiere: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to update premiere")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Premiere updated successfully"})
}

func (h *PremiereHandler) DeletePremiere(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	premiereID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid premiere ID")
		return
	}

	if err := h.premiereRepo.Delete(premiereID); err != nil {
		log.Printf("Error deleting premiere: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to delete premiere")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Premiere deleted successfully"})
}
