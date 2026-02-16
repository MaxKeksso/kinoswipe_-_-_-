package handlers

import (
	"encoding/json"
	"net/http"

	"kinoswipe/middleware"
	"kinoswipe/models"

	"github.com/google/uuid"
)

// UserIDFromRequest возвращает ID пользователя из контекста (JWT/X-User-ID) или из заголовка X-User-ID. ok=false если не авторизован.
func UserIDFromRequest(r *http.Request) (uuid.UUID, bool) {
	user := middleware.GetUserFromRequest(r)
	if user != nil {
		return user.ID, true
	}
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// RequireUserID возвращает 401 если пользователь не определён. Иначе возвращает его ID.
func RequireUserID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, ok := UserIDFromRequest(r)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "Требуется авторизация")
		return uuid.Nil, false
	}
	return id, true
}

// MustGetUser возвращает пользователя из контекста или nil.
func MustGetUser(r *http.Request) *models.User {
	return middleware.GetUserFromRequest(r)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Internal Server Error"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

