package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
}

func NewAuthHandler(userRepo *repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

// Register обрабатывает регистрацию обычного пользователя
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Валидация
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	
	if req.Username == "" {
		respondWithError(w, http.StatusBadRequest, "Username is required")
		return
	}
	if req.Email == "" {
		respondWithError(w, http.StatusBadRequest, "Email is required")
		return
	}
	if len(req.Password) < 6 {
		respondWithError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	// Хеширование пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	// Проверка, существует ли пользователь с таким email
	existingUser, _ := h.userRepo.GetByEmail(req.Email)
	if existingUser != nil {
		respondWithError(w, http.StatusConflict, "User with this email already exists")
		return
	}

	// Создание пользователя
	user := &models.User{
		ID:           uuid.New(),
		Username:     req.Username,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hashedPassword),
		UserType:     models.UserTypeRegular,
	}

	if err := h.userRepo.Create(user); err != nil {
		log.Printf("Error creating user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Не возвращаем пароль в ответе
	user.PasswordHash = ""
	respondWithJSON(w, http.StatusCreated, user)
}

// Login обрабатывает вход (для обычных пользователей и админов)
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Поиск пользователя по email
	user, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Проверка пароля
	if user.PasswordHash == "" {
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Не возвращаем пароль в ответе
	user.PasswordHash = ""
	respondWithJSON(w, http.StatusOK, user)
}
