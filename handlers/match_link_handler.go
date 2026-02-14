package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type MatchLinkHandler struct {
	linkRepo *repository.MatchLinkRepository
}

func NewMatchLinkHandler(linkRepo *repository.MatchLinkRepository) *MatchLinkHandler {
	return &MatchLinkHandler{linkRepo: linkRepo}
}

func (h *MatchLinkHandler) GetMatchLinks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	matchID, err := uuid.Parse(vars["match_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid match ID")
		return
	}

	links, err := h.linkRepo.GetByMatchID(matchID)
	if err != nil {
		log.Printf("Error getting match links: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to get match links")
		return
	}

	respondWithJSON(w, http.StatusOK, links)
}

func (h *MatchLinkHandler) CreateMatchLink(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	matchID, err := uuid.Parse(vars["match_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid match ID")
		return
	}

	var req models.CreateMatchLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	link := &models.MatchLink{
		ID:       uuid.New(),
		MatchID:  matchID,
		Platform: req.Platform,
		URL:      req.URL,
		Title:    req.Title,
	}

	if err := h.linkRepo.Create(link); err != nil {
		log.Printf("Error creating match link: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create match link")
		return
	}

	respondWithJSON(w, http.StatusCreated, link)
}
