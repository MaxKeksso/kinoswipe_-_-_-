package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type FilterRepository struct {
	db *sql.DB
}

func NewFilterRepository(db *sql.DB) *FilterRepository {
	return &FilterRepository{db: db}
}

func (r *FilterRepository) Create(filter *models.Filter) error {
	var genresJSON sql.NullString
	if filter.Genres != "" {
		genresJSON = sql.NullString{String: filter.Genres, Valid: true}
	}

	query := `
		INSERT INTO filters (id, room_id, genres, year_from, year_to, duration_min, duration_max, min_rating, mood)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(
		query,
		filter.ID,
		filter.RoomID,
		genresJSON,
		filter.YearFrom,
		filter.YearTo,
		filter.DurationMin,
		filter.DurationMax,
		filter.MinRating,
		filter.Mood,
	).Scan(&filter.CreatedAt, &filter.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create filter: %w", err)
	}

	return nil
}

func (r *FilterRepository) GetByID(id uuid.UUID) (*models.Filter, error) {
	filter := &models.Filter{}
	var genresJSON sql.NullString
	var roomID sql.NullString

	query := `
		SELECT id, room_id, genres, year_from, year_to, duration_min, duration_max, min_rating, mood, created_at, updated_at
		FROM filters
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&filter.ID,
		&roomID,
		&genresJSON,
		&filter.YearFrom,
		&filter.YearTo,
		&filter.DurationMin,
		&filter.DurationMax,
		&filter.MinRating,
		&filter.Mood,
		&filter.CreatedAt,
		&filter.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("filter not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get filter: %w", err)
	}

	if roomID.Valid {
		id, _ := uuid.Parse(roomID.String)
		filter.RoomID = &id
	}

	if genresJSON.Valid {
		filter.Genres = genresJSON.String
	}

	return filter, nil
}

func (r *FilterRepository) GetByRoomID(roomID uuid.UUID) (*models.Filter, error) {
	filter := &models.Filter{}
	var genresJSON sql.NullString
	var roomIDStr sql.NullString

	query := `
		SELECT id, room_id, genres, year_from, year_to, duration_min, duration_max, min_rating, mood, created_at, updated_at
		FROM filters
		WHERE room_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(query, roomID).Scan(
		&filter.ID,
		&roomIDStr,
		&genresJSON,
		&filter.YearFrom,
		&filter.YearTo,
		&filter.DurationMin,
		&filter.DurationMax,
		&filter.MinRating,
		&filter.Mood,
		&filter.CreatedAt,
		&filter.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("filter not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get filter by room: %w", err)
	}

	if roomIDStr.Valid {
		id, _ := uuid.Parse(roomIDStr.String)
		filter.RoomID = &id
	}

	if genresJSON.Valid {
		filter.Genres = genresJSON.String
	}

	return filter, nil
}

func (r *FilterRepository) Update(filter *models.Filter) error {
	var genresJSON sql.NullString
	if filter.Genres != "" {
		genresJSON = sql.NullString{String: filter.Genres, Valid: true}
	}

	query := `
		UPDATE filters
		SET genres = COALESCE($1, genres),
		    year_from = COALESCE($2, year_from),
		    year_to = COALESCE($3, year_to),
		    duration_min = COALESCE($4, duration_min),
		    duration_max = COALESCE($5, duration_max),
		    min_rating = COALESCE($6, min_rating),
		    mood = COALESCE($7, mood),
		    updated_at = NOW()
		WHERE id = $8
	`

	_, err := r.db.Exec(
		query,
		genresJSON,
		filter.YearFrom,
		filter.YearTo,
		filter.DurationMin,
		filter.DurationMax,
		filter.MinRating,
		filter.Mood,
		filter.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update filter: %w", err)
	}

	return nil
}

// Helper functions для работы с JSON
func GenresToJSON(genres []string) string {
	if len(genres) == 0 {
		return ""
	}
	data, _ := json.Marshal(genres)
	return string(data)
}

func JSONToGenres(jsonStr string) ([]string, error) {
	if jsonStr == "" {
		return []string{}, nil
	}
	var genres []string
	err := json.Unmarshal([]byte(jsonStr), &genres)
	return genres, err
}

