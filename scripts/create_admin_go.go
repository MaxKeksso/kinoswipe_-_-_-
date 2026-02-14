//go:build createadmin

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load() // загружаем .env из корня проекта
	// Подключение к базе данных: из .env (DATABASE_URL) или значения по умолчанию
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://kinoswipe:kinoswipe123@localhost:5433/kinoswipe?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Проверка подключения
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	email := "admin@kinoswipe.ru"
	password := "admin123"
	username := "Администратор"

	// Хешируем пароль с помощью bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Проверяем, существует ли админ
	var existingID string
	err = db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&existingID)
	
	if err == sql.ErrNoRows {
		// Создаем нового админа
		query := `
			INSERT INTO users (id, username, email, password_hash, user_type, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, $3, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			RETURNING id
		`
		var newID string
		err = db.QueryRow(query, username, email, string(hashedPassword)).Scan(&newID)
		if err != nil {
			log.Fatalf("Failed to create admin: %v", err)
		}
		fmt.Printf("✅ Администратор создан! ID: %s\n", newID)
	} else if err != nil {
		log.Fatalf("Failed to check admin: %v", err)
	} else {
		// Обновляем существующего админа
		query := `
			UPDATE users 
			SET password_hash = $1, user_type = 'admin', updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
		`
		_, err = db.Exec(query, string(hashedPassword), existingID)
		if err != nil {
			log.Fatalf("Failed to update admin: %v", err)
		}
		fmt.Printf("✅ Администратор обновлен! ID: %s\n", existingID)
	}

	fmt.Println("\n📝 Данные для входа:")
	fmt.Printf("   Email: %s\n", email)
	fmt.Printf("   Пароль: %s\n", password)
}
