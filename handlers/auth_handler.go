package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"kinoswipe/config"
	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo   *repository.UserRepository
	refreshRepo *repository.RefreshTokenRepository
	cfg        *config.Config
}

func NewAuthHandler(userRepo *repository.UserRepository, refreshRepo *repository.RefreshTokenRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, refreshRepo: refreshRepo, cfg: cfg}
}

func (h *AuthHandler) generateAccessToken(userID uuid.UUID, userType models.UserType) (string, time.Duration, error) {
	expiry, _ := time.ParseDuration(h.cfg.JWT.Expiry)
	if expiry <= 0 {
		expiry = 24 * time.Hour
	}
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"type": string(userType),
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.cfg.JWT.Secret))
	return signed, expiry, err
}

func (h *AuthHandler) generateRefreshToken(userID uuid.UUID) (token string, tokenHash string, expiresAt time.Time, err error) {
	expiry, _ := time.ParseDuration(h.cfg.JWT.RefreshExpiry)
	if expiry <= 0 {
		expiry = 7 * 24 * time.Hour
	}
	expiresAt = time.Now().Add(expiry)
	token = uuid.New().String() + "." + uuid.New().String()
	hash := sha256.Sum256([]byte(token))
	tokenHash = hex.EncodeToString(hash[:])
	err = h.refreshRepo.Create(userID, tokenHash, expiresAt)
	return
}

// Register обрабатывает регистрацию обычного пользователя
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Неверный формат данных")
		return
	}

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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Ошибка обработки пароля")
		return
	}

	existingUser, _ := h.userRepo.GetByEmail(req.Email)
	if existingUser != nil {
		respondWithError(w, http.StatusConflict, "Пользователь с таким email уже существует")
		return
	}

	if req.Phone != "" {
		existingUserByPhone, _ := h.userRepo.GetByPhone(req.Phone)
		if existingUserByPhone != nil {
			respondWithError(w, http.StatusConflict, "Пользователь с таким телефоном уже существует")
			return
		}
	}

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

	user.PasswordHash = ""
	respondWithJSON(w, http.StatusCreated, user)
}

// Login обрабатывает вход, возвращает user + access_token + refresh_token
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

	user, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}

	if user.PasswordHash == "" {
		respondWithError(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}

	accessToken, expiry, err := h.generateAccessToken(user.ID, user.UserType)
	if err != nil {
		log.Printf("Error generating access token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Ошибка создания токена")
		return
	}

	refreshToken, tokenHash, expiresAt, err := h.generateRefreshToken(user.ID)
	if err != nil {
		log.Printf("Error generating refresh token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Ошибка создания токена")
		return
	}

	_ = tokenHash
	_ = expiresAt

	user.PasswordHash = ""
	respondWithJSON(w, http.StatusOK, models.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(expiry.Seconds()),
	})
}

// RefreshRequest тело запроса на обновление токена
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Refresh обновляет пару токенов по refresh_token
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		respondWithError(w, http.StatusBadRequest, "Неверный формат данных")
		return
	}

	hash := sha256.Sum256([]byte(req.RefreshToken))
	tokenHash := hex.EncodeToString(hash[:])

	userID, expiresAt, revoked, err := h.refreshRepo.GetByTokenHash(tokenHash)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Недействительный refresh token")
		return
	}
	if revoked || time.Now().After(expiresAt) {
		respondWithError(w, http.StatusUnauthorized, "Недействительный или истёкший refresh token")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil || user == nil {
		respondWithError(w, http.StatusUnauthorized, "Пользователь не найден")
		return
	}

	_ = h.refreshRepo.RevokeByTokenHash(tokenHash)

	accessToken, expiry, err := h.generateAccessToken(user.ID, user.UserType)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Ошибка создания токена")
		return
	}

	newRefresh, _, _, err := h.generateRefreshToken(user.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Ошибка создания токена")
		return
	}

	user.PasswordHash = ""
	respondWithJSON(w, http.StatusOK, models.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: newRefresh,
		ExpiresIn:    int64(expiry.Seconds()),
	})
}
