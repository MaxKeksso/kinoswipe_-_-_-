package repository

import (
	"database/sql"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type MatchRepository struct {
	db *sql.DB
}

func NewMatchRepository(db *sql.DB) *MatchRepository {
	return &MatchRepository{db: db}
}

func (r *MatchRepository) Create(match *models.Match) error {
	query := `
		INSERT INTO matches (id, room_id, movie_id)
		VALUES ($1, $2, $3)
		RETURNING created_at
	`

	err := r.db.QueryRow(
		query,
		match.ID,
		match.RoomID,
		match.MovieID,
	).Scan(&match.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create match: %w", err)
	}

	return nil
}

func (r *MatchRepository) GetByID(id uuid.UUID) (*models.Match, error) {
	match := &models.Match{}
	query := `
		SELECT id, room_id, movie_id, created_at
		FROM matches
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&match.ID,
		&match.RoomID,
		&match.MovieID,
		&match.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("match not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get match: %w", err)
	}

	return match, nil
}

func (r *MatchRepository) GetByRoomID(roomID uuid.UUID) ([]models.Match, error) {
	query := `
		SELECT id, room_id, movie_id, created_at
		FROM matches
		WHERE room_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get matches: %w", err)
	}
	defer rows.Close()

	var matches []models.Match
	for rows.Next() {
		match := models.Match{}
		err := rows.Scan(
			&match.ID,
			&match.RoomID,
			&match.MovieID,
			&match.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan match: %w", err)
		}
		matches = append(matches, match)
	}

	return matches, nil
}

func (r *MatchRepository) Exists(roomID, movieID uuid.UUID) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM matches WHERE room_id = $1 AND movie_id = $2)`
	err := r.db.QueryRow(query, roomID, movieID).Scan(&exists)
	return exists, err
}

func (r *MatchRepository) CountByRoom(roomID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM matches WHERE room_id = $1`
	err := r.db.QueryRow(query, roomID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count matches: %w", err)
	}
	return count, nil
}

