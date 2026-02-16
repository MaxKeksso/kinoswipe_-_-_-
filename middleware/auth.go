package middleware

import (
	"context"
	"net/http"
	"strings"

	"kinoswipe/config"
	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// AuthMiddleware проверяет JWT в заголовке Authorization (Bearer) или fallback на X-User-ID.
// Устанавливает пользователя в контекст. Совместимость с текущим фронтом сохраняется.
func AuthMiddleware(userRepo *repository.UserRepository, cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var user *models.User

			// 1. Пробуем JWT из Authorization: Bearer <token>
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
				claims := &jwt.MapClaims{}
				token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
					return []byte(cfg.JWT.Secret), nil
				})
				if err == nil && token.Valid {
					if sub, ok := (*claims)["sub"].(string); ok {
						userID, err := uuid.Parse(sub)
						if err == nil {
							user, _ = userRepo.GetByID(userID)
						}
					}
				}
			}

			// 2. Fallback: X-User-ID (совместимость со старым клиентом)
			if user == nil {
				userIDStr := r.Header.Get("X-User-ID")
				if userIDStr != "" {
					userID, err := uuid.Parse(userIDStr)
					if err == nil {
						user, _ = userRepo.GetByID(userID)
					}
				}
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuth возвращает 401, если в контексте нет пользователя.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromRequest(r)
		if user == nil {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"Требуется авторизация"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAdmin возвращает 403, если пользователь не admin.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromRequest(r)
		if user == nil {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"Требуется авторизация"}`, http.StatusUnauthorized)
			return
		}
		if user.UserType != models.UserTypeAdmin {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"Доступ запрещён. Требуются права администратора."}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetUserFromRequest извлекает пользователя из контекста (может быть nil).
func GetUserFromRequest(r *http.Request) *models.User {
	v := r.Context().Value(UserContextKey)
	if v == nil {
		return nil
	}
	u, _ := v.(*models.User)
	return u
}
