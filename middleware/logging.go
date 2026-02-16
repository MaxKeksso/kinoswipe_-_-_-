package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// logEntry — структура для JSON-лога запроса.
type logEntry struct {
	Level      string  `json:"level"`
	RequestID  string  `json:"request_id,omitempty"`
	Method     string  `json:"method"`
	Path       string  `json:"path"`
	Status     int     `json:"status"`
	DurationMs float64 `json:"duration_ms"`
	Message    string  `json:"message,omitempty"`
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		wrapped := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		entry := logEntry{
			Level:      "info",
			RequestID:  GetRequestID(r.Context()),
			Method:     r.Method,
			Path:       r.URL.Path,
			Status:     wrapped.statusCode,
			DurationMs: float64(duration.Microseconds()) / 1000,
		}
		if wrapped.statusCode >= 500 {
			entry.Level = "error"
		} else if wrapped.statusCode >= 400 {
			entry.Level = "warn"
		}
		body, _ := json.Marshal(entry)
		log.Println(string(body))
	})
}
