package middleware

import (
	"net/http"
	"sync"
	"time"
)

// RateLimiter ограничивает число запросов по ключу (например по IP) в заданном окне.
type RateLimiter struct {
	mu       sync.Mutex
	visits   map[string][]time.Time
	limit    int           // макс. запросов в окне
	window   time.Duration // окно (например 1 минута)
	keyFunc  func(*http.Request) string
}

// NewRateLimiter создаёт лимитер: limit запросов в window на ключ (по умолчанию по IP).
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		visits:  make(map[string][]time.Time),
		limit:   limit,
		window:  window,
		keyFunc: func(r *http.Request) string { return r.RemoteAddr },
	}
}

// SetKeyFunc задаёт функцию ключа (например по X-User-ID или по IP).
func (rl *RateLimiter) SetKeyFunc(f func(*http.Request) string) {
	rl.keyFunc = f
}

func (rl *RateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)
	// оставляем только визиты в текущем окне
	var kept []time.Time
	for _, t := range rl.visits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= rl.limit {
		return false
	}
	rl.visits[key] = append(kept, now)
	return true
}

// Middleware возвращает middleware, возвращающий 429 при превышении лимита.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := rl.keyFunc(r)
		if key == "" {
			key = r.RemoteAddr
		}
		if !rl.allow(key) {
			w.Header().Set("Retry-After", "60")
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
