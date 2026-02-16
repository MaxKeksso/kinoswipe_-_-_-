package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type UserHandler struct {
	userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	log.Printf("CreateUser: received request from %s", r.RemoteAddr)
	
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("CreateUser: failed to decode request: %v", err)
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	log.Printf("CreateUser: request data - username: %q, email: %q, phone: %q", req.Username, req.Email, req.Phone)

	// Обрезаем пробелы и валидируем username
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" {
		log.Printf("CreateUser: username is empty after trim")
		respondWithError(w, http.StatusBadRequest, "Username is required")
		return
	}

	user := &models.User{
		ID:       uuid.New(),
		Email:    req.Email,
		Phone:    req.Phone,
		Username: req.Username,
		UserType: models.UserTypeRegular,
	}

	log.Printf("CreateUser: attempting to create user with ID: %s, username: %s", user.ID, user.Username)
	if err := h.userRepo.Create(user); err != nil {
		log.Printf("CreateUser: database error: %v", err)
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create user: %v", err))
		return
	}

	log.Printf("CreateUser: user created successfully with ID: %s", user.ID)
	respondWithJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	respondWithJSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.userRepo.Update(userID, &req); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update user")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	respondWithJSON(w, http.StatusOK, user)
}

// GetUserStatistics возвращает статистику пользователя
func (h *UserHandler) GetUserStatistics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Неверный ID пользователя")
		return
	}

	stats, err := h.userRepo.GetStatistics(userID)
	if err != nil {
		log.Printf("Error getting user statistics: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Ошибка получения статистики")
		return
	}

	respondWithJSON(w, http.StatusOK, stats)
}
