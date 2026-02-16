package handlers

import (
	"encoding/json"
	"fmt"
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
	
	log.Printf("GetMatches called with league=%s", league)
	
	var matches []service.FootballMatch
	var err error
	
	if league == "RPL" {
		log.Printf("Fetching RPL matches")
		matches, err = h.footballService.GetRPLMatches()
		if err != nil {
			log.Printf("Error fetching RPL matches: %v", err)
		} else {
			log.Printf("Successfully fetched %d RPL matches", len(matches))
		}
	} else if league == "CL" || league == "EU" {
		log.Printf("Fetching European matches")
		matches, err = h.footballService.GetEuropeanMatches()
		if err != nil {
			log.Printf("Error fetching European matches: %v", err)
		} else {
			log.Printf("Successfully fetched %d European matches", len(matches))
		}
	} else {
		// По умолчанию возвращаем все матчи
		log.Printf("Fetching all matches (RPL + European)")
		rplMatches, err1 := h.footballService.GetRPLMatches()
		euroMatches, err2 := h.footballService.GetEuropeanMatches()
		
		if err1 != nil {
			log.Printf("Error fetching RPL matches: %v", err1)
		}
		if err2 != nil {
			log.Printf("Error fetching European matches: %v", err2)
		}
		
		if err1 != nil || err2 != nil {
			log.Printf("One or both requests failed, but continuing with available data")
		}
		
		log.Printf("RPL matches: %d, European matches: %d", len(rplMatches), len(euroMatches))
		
		response := map[string]interface{}{
			"rpl":      rplMatches,
			"european": euroMatches,
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	
	if err != nil {
		log.Printf("Error fetching matches: %v", err)
		http.Error(w, fmt.Sprintf("Failed to fetch matches: %v", err), http.StatusInternalServerError)
		return
	}
	
	log.Printf("Returning %d matches", len(matches))
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
