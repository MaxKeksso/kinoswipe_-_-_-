package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"unicode/utf8"

	"kinoswipe/repository"
)

// GameHandler обрабатывает запросы к игровому API (Space Shooter)
type GameHandler struct {
	repo *repository.GameScoreRepository
}

// NewGameHandler создаёт новый обработчик игры
func NewGameHandler(repo *repository.GameScoreRepository) *GameHandler {
	return &GameHandler{repo: repo}
}

// submitScoreRequest — тело запроса POST /game/scores
type submitScoreRequest struct {
	PlayerName    string         `json:"player_name"`
	Score         int            `json:"score"`
	Wave          int            `json:"wave"`
	EnemiesKilled map[string]int `json:"enemies_killed"`
}

// SubmitScore — POST /api/v1/game/scores
// Принимает рекорд игрока и сохраняет в БД
func (h *GameHandler) SubmitScore(w http.ResponseWriter, r *http.Request) {
	var req submitScoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Неверный формат запроса")
		return
	}

	// Валидация имени игрока
	req.PlayerName = strings.TrimSpace(req.PlayerName)
	if req.PlayerName == "" {
		req.PlayerName = "Аноним"
	}
	if utf8.RuneCountInString(req.PlayerName) > 30 {
		runes := []rune(req.PlayerName)
		req.PlayerName = string(runes[:30])
	}

	if req.Score < 0 {
		req.Score = 0
	}
	if req.Wave < 1 {
		req.Wave = 1
	}

	// Опционально — привязка к авторизованному пользователю
	var userID *string
	if user := MustGetUser(r); user != nil {
		id := user.ID.String()
		userID = &id
	}

	// Сериализуем enemies_killed в JSON для хранения в JSONB
	enemiesJSON, err := json.Marshal(req.EnemiesKilled)
	if err != nil {
		enemiesJSON = []byte(`{"scout":0,"cruiser":0,"boss":0}`)
	}

	rec, err := h.repo.SaveScore(req.PlayerName, userID, req.Score, req.Wave, string(enemiesJSON))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Ошибка сохранения рекорда")
		return
	}

	respondWithJSON(w, http.StatusCreated, rec)
}

// GetLeaderboard — GET /api/v1/game/leaderboard
// Возвращает топ-10 рекордов
func (h *GameHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	records, err := h.repo.GetTopScores(10)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Ошибка получения рекордов")
		return
	}

	if records == nil {
		records = []*repository.GameScoreRecord{}
	}

	respondWithJSON(w, http.StatusOK, records)
}
