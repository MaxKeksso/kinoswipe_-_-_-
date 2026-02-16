package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"kinoswipe/service"
)

type FootballHandler struct {
	footballService *service.FootballService
}

func NewFootballHandler(footballService *service.FootballService) *FootballHandler {
	return &FootballHandler{
		footballService: footballService,
	}
}

// GetMatches возвращает матчи для отображения на странице футбола
func (h *FootballHandler) GetMatches(w http.ResponseWriter, r *http.Request) {
	// Получаем параметры запроса
	league := r.URL.Query().Get("league") // "RPL" или "CL" (Champions League)
	
	var matches []service.FootballMatch
	var err error
	
	if league == "RPL" {
		matches, err = h.footballService.GetRPLMatches()
	} else if league == "CL" || league == "EU" {
		matches, err = h.footballService.GetEuropeanMatches()
	} else {
		// По умолчанию возвращаем все матчи
		rplMatches, err1 := h.footballService.GetRPLMatches()
		euroMatches, err2 := h.footballService.GetEuropeanMatches()
		
		if err1 != nil || err2 != nil {
			http.Error(w, "Failed to fetch matches", http.StatusInternalServerError)
			return
		}
		
		response := map[string]interface{}{
			"rpl":     rplMatches,
			"european": euroMatches,
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	
	if err != nil {
		log.Printf("Error fetching matches: %v", err)
		http.Error(w, "Failed to fetch matches", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(matches)
}

// RefreshMatches принудительно обновляет кеш матчей
func (h *FootballHandler) RefreshMatches(w http.ResponseWriter, r *http.Request) {
	err := h.footballService.RefreshCache()
	if err != nil {
		log.Printf("Error refreshing cache: %v", err)
		http.Error(w, "Failed to refresh cache", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "Cache refreshed"})
}
