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
		respondWithError(w, http.StatusBadRequest, "Неверный формат данных")
		return
	}

	// Валидация
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	
	if req.Username == "" {
		respondWithError(w, http.StatusBadRequest, "Имя пользователя обязательно")
		return
	}
	if req.Email == "" {
		respondWithError(w, http.StatusBadRequest, "Email обязателен")
		return
	}
	if len(req.Password) < 6 {
		respondWithError(w, http.StatusBadRequest, "Пароль должен содержать минимум 6 символов")
		return
	}

	// Хеширование пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Ошибка обработки пароля")
		return
	}

	// Проверка, существует ли пользователь с таким email
	existingUser, _ := h.userRepo.GetByEmail(req.Email)
	if existingUser != nil {
		respondWithError(w, http.StatusConflict, "Пользователь с таким email уже существует")
		return
	}

	// Проверка, существует ли пользователь с таким телефоном (если указан)
	if req.Phone != "" {
		existingUserByPhone, _ := h.userRepo.GetByPhone(req.Phone)
		if existingUserByPhone != nil {
			respondWithError(w, http.StatusConflict, "Пользователь с таким телефоном уже существует")
			return
		}
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
		
		// Проверяем тип ошибки для более понятного сообщения
		errStr := err.Error()
		if strings.Contains(errStr, "unique") || strings.Contains(errStr, "duplicate") {
			if strings.Contains(errStr, "email") {
				respondWithError(w, http.StatusConflict, "Пользователь с таким email уже существует")
			} else if strings.Contains(errStr, "phone") {
				respondWithError(w, http.StatusConflict, "Пользователь с таким телефоном уже существует")
			} else {
				respondWithError(w, http.StatusConflict, "Пользователь с такими данными уже существует")
			}
		} else {
			respondWithError(w, http.StatusInternalServerError, "Ошибка создания пользователя. Попробуйте позже.")
		}
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
		respondWithError(w, http.StatusBadRequest, "Неверный формат данных")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Email и пароль обязательны")
		return
	}

	// Поиск пользователя по email
	user, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}

	// Проверка пароля
	if user.PasswordHash == "" {
		respondWithError(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}

	// Не возвращаем пароль в ответе
	user.PasswordHash = ""
	respondWithJSON(w, http.StatusOK, user)
}
