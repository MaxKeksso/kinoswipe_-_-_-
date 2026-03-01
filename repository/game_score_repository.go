package repository

import (
	"database/sql"
	"fmt"
	"time"
)

// GameScoreRecord — запись рекорда из таблицы game_scores
type GameScoreRecord struct {
	ID            string
	PlayerName    string
	UserID        *string
	Score         int
	Wave          int
	EnemiesKilled string // JSON: {"scout":N,"cruiser":N,"boss":N}
	CreatedAt     time.Time
}

// GameScoreRepository — репозиторий для работы с рекордами игры
type GameScoreRepository struct {
	db *sql.DB
}

// NewGameScoreRepository создаёт новый репозиторий рекордов
func NewGameScoreRepository(db *sql.DB) *GameScoreRepository {
	return &GameScoreRepository{db: db}
}

// SaveScore сохраняет новый рекорд в БД
func (r *GameScoreRepository) SaveScore(playerName string, userID *string, score, wave int, enemiesKilledJSON string) (*GameScoreRecord, error) {
	query := `
		INSERT INTO game_scores (player_name, user_id, score, wave, enemies_killed)
		VALUES ($1, $2, $3, $4, $5::jsonb)
		RETURNING id, player_name, user_id, score, wave, enemies_killed::text, created_at
	`

	rec := &GameScoreRecord{}
	var dbUserID sql.NullString

	err := r.db.QueryRow(query, playerName, userID, score, wave, enemiesKilledJSON).Scan(
		&rec.ID,
		&rec.PlayerName,
		&dbUserID,
		&rec.Score,
		&rec.Wave,
		&rec.EnemiesKilled,
		&rec.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save game score: %w", err)
	}
	if dbUserID.Valid {
		rec.UserID = &dbUserID.String
	}
	return rec, nil
}

// GetTopScores возвращает топ-N рекордов, отсортированных по убыванию счёта
func (r *GameScoreRepository) GetTopScores(limit int) ([]*GameScoreRecord, error) {
	query := `
		SELECT id, player_name, user_id, score, wave, enemies_killed::text, created_at
		FROM game_scores
		ORDER BY score DESC, created_at ASC
		LIMIT $1
	`

	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top scores: %w", err)
	}
	defer rows.Close()

	var records []*GameScoreRecord
	for rows.Next() {
		rec := &GameScoreRecord{}
		var dbUserID sql.NullString

		if err := rows.Scan(
			&rec.ID,
			&rec.PlayerName,
			&dbUserID,
			&rec.Score,
			&rec.Wave,
			&rec.EnemiesKilled,
			&rec.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan game score: %w", err)
		}
		if dbUserID.Valid {
			rec.UserID = &dbUserID.String
		}
		records = append(records, rec)
	}
	return records, nil
}
