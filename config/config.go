package config

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	JWT        JWTConfig
	MovieAPI   MovieAPIConfig
	FootballAPI FootballAPIConfig
	WebSocket  WebSocketConfig
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

type FootballAPIConfig struct {
	Key string
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
	// DATABASE_URL или альтернативы (Railway: DATABASE_URL, POSTGRES_URL и т.д.)
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("POSTGRES_URL")
	}
	if dbURL == "" {
		dbURL = os.Getenv("POSTGRES_PRIVATE_URL")
	}
	onRailway := os.Getenv("PORT") != ""
	if dbURL != "" {
		parsed, err := parseDatabaseURL(dbURL)
		if err == nil {
			// На Railway нельзя подключаться к localhost — так приложение не видит облачную БД
			h := strings.ToLower(strings.TrimSpace(parsed.Host))
			if onRailway && (h == "localhost" || h == "127.0.0.1" || h == "::1" || strings.HasPrefix(h, "localhost")) {
				log.Fatal("DATABASE_URL points to localhost. On Railway use Variables → + New Variable → Add Reference → PostgreSQL → DATABASE_URL. Do not paste a local URL. See RAILWAY_НАСТРОЙКА_БД.md")
			}
			dbConfig = parsed
		}
	}
	// В облаке без корректного URL — явно падаем
	if onRailway && (dbConfig.Host == "localhost" || dbConfig.Host == "127.0.0.1") {
		log.Fatal("DATABASE_URL is missing or invalid. In Railway: Service → Variables → + New Variable → Add Reference → PostgreSQL → DATABASE_URL. See RAILWAY_НАСТРОЙКА_БД.md")
	}

	// PORT задаёт Railway/Render/Fly; SERVER_HOST 0.0.0.0 нужен для приёма снаружи
	serverPort := getEnv("PORT", getEnv("SERVER_PORT", "8080"))
	serverHost := getEnv("SERVER_HOST", "0.0.0.0")
	config := &Config{
		Server: ServerConfig{
			Host: serverHost,
			Port: serverPort,
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
		FootballAPI: FootballAPIConfig{
			Key: getEnv("FOOTBALL_API_KEY", ""),
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

