package handlers

import (
	"net/http"

	"kinoswipe/repository"
	"kinoswipe/service"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type MatchHandler struct {
	matchRepo   *repository.MatchRepository
	matchService *service.MatchService
}

func NewMatchHandler(matchRepo *repository.MatchRepository, matchService *service.MatchService) *MatchHandler {
	return &MatchHandler{
		matchRepo:   matchRepo,
		matchService: matchService,
	}
}

func (h *MatchHandler) GetMatch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	matchID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid match ID")
		return
	}

	matchDetails, err := h.matchService.GetMatchWithDetails(matchID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Match not found")
		return
	}

	respondWithJSON(w, http.StatusOK, matchDetails)
}

func (h *MatchHandler) GetRoomMatches(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	matches, err := h.matchRepo.GetByRoomID(roomID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get matches")
		return
	}

	respondWithJSON(w, http.StatusOK, matches)
}

// GetRoomAlmostMatches возвращает фильмы, которые лайкнули все активные участники кроме одного (N-1).
func (h *MatchHandler) GetRoomAlmostMatches(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	list, err := h.matchService.GetAlmostMatches(roomID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get almost matches")
		return
	}

	respondWithJSON(w, http.StatusOK, list)
}

