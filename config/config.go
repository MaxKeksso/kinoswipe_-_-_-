package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	MovieAPI MovieAPIConfig
	WebSocket WebSocketConfig
}

type ServerConfig struct {
	Host string
	Port string
	Env  string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	Secret string
	Expiry string
}

type MovieAPIConfig struct {
	Key string
	URL string
}

type WebSocketConfig struct {
	ReadBufferSize  int
	WriteBufferSize int
}

func Load() (*Config, error) {
	// Try to load .env file, but don't fail if it doesn't exist
	_ = godotenv.Load()

	dbConfig := DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "kinoswipe"),
		Password: getEnv("DB_PASSWORD", "kinoswipe123"),
		Name:     getEnv("DB_NAME", "kinoswipe"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
	// Если задан DATABASE_URL — используем его и парсим параметры
	if u := os.Getenv("DATABASE_URL"); u != "" {
		parsed, err := parseDatabaseURL(u)
		if err == nil {
			dbConfig = parsed
		}
	}

	config := &Config{
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "localhost"),
			Port: getEnv("SERVER_PORT", "8080"),
			Env:  getEnv("ENV", "development"),
		},
		Database: dbConfig,
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "change-me-in-production"),
			Expiry: getEnv("JWT_EXPIRY", "24h"),
		},
		MovieAPI: MovieAPIConfig{
			Key: getEnv("MOVIE_API_KEY", ""),
			URL: getEnv("MOVIE_API_URL", ""),
		},
		WebSocket: WebSocketConfig{
			ReadBufferSize:  getEnvAsInt("WS_READ_BUFFER_SIZE", 1024),
			WriteBufferSize: getEnvAsInt("WS_WRITE_BUFFER_SIZE", 1024),
		},
	}

	return config, nil
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode)
}

// parseDatabaseURL разбирает DATABASE_URL в формате postgres://user:pass@host:port/dbname?sslmode=disable
func parseDatabaseURL(u string) (DatabaseConfig, error) {
	parsed, err := url.Parse(u)
	if err != nil {
		return DatabaseConfig{}, err
	}
	if parsed.Scheme != "postgres" && parsed.Scheme != "postgresql" {
		return DatabaseConfig{}, fmt.Errorf("unsupported scheme: %s", parsed.Scheme)
	}
	port := parsed.Port()
	if port == "" {
		port = "5432"
	}
	password, _ := parsed.User.Password()
	sslMode := "disable"
	if q := parsed.Query().Get("sslmode"); q != "" {
		sslMode = q
	}
	dbName := strings.TrimPrefix(parsed.Path, "/")
	if dbName == "" {
		dbName = "kinoswipe"
	}
	return DatabaseConfig{
		Host:     parsed.Hostname(),
		Port:     port,
		User:     parsed.User.Username(),
		Password: password,
		Name:     dbName,
		SSLMode:  sslMode,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

