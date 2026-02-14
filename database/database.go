package database

import (
	"database/sql"
	"fmt"
	"log"

	"kinoswipe/config"

	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func New(cfg config.DatabaseConfig) (*DB, error) {
	dsn := cfg.DSN()
	
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Установка параметров соединения
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	log.Println("Database connection established successfully")

	return &DB{db}, nil
}

func (db *DB) Close() error {
	return db.DB.Close()
}

