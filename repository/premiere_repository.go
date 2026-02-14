package repository

import (
	"database/sql"
	"fmt"
	"time"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type PremiereRepository struct {
	db *sql.DB
}

func NewPremiereRepository(db *sql.DB) *PremiereRepository {
	return &PremiereRepository{db: db}
}

func (r *PremiereRepository) GetAll(position *string) ([]*models.Premiere, error) {
	var query string
	var args []interface{}

	if position != nil {
		query = `
			SELECT id, movie_id, title, description, poster_url, release_date, is_active, position, created_at, updated_at
			FROM premieres
			WHERE is_active = true AND position = $1
			ORDER BY release_date DESC, created_at DESC
		`
		args = []interface{}{*position}
	} else {
		query = `
			SELECT id, movie_id, title, description, poster_url, release_date, is_active, position, created_at, updated_at
			FROM premieres
			WHERE is_active = true
			ORDER BY release_date DESC, created_at DESC
		`
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get premieres: %w", err)
	}
	defer rows.Close()

	var premieres []*models.Premiere
	for rows.Next() {
		premiere := &models.Premiere{}
		var movieID sql.NullString
		var description, posterURL sql.NullString
		var releaseDate sql.NullTime

		err := rows.Scan(
			&premiere.ID,
			&movieID,
			&premiere.Title,
			&description,
			&posterURL,
			&releaseDate,
			&premiere.IsActive,
			&premiere.Position,
			&premiere.CreatedAt,
			&premiere.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan premiere: %w", err)
		}

		if movieID.Valid {
			premiere.MovieID = uuid.MustParse(movieID.String)
		}
		if description.Valid {
			premiere.Description = description.String
		}
		if posterURL.Valid {
			premiere.PosterURL = posterURL.String
		}
		if releaseDate.Valid {
			premiere.ReleaseDate = releaseDate.Time
		}

		premieres = append(premieres, premiere)
	}

	return premieres, nil
}

func (r *PremiereRepository) Create(premiere *models.Premiere) error {
	query := `
		INSERT INTO premieres (id, movie_id, title, description, poster_url, release_date, is_active, position)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	var movieID interface{}
	if premiere.MovieID != uuid.Nil {
		movieID = premiere.MovieID
	} else {
		movieID = nil
	}

	var releaseDate interface{}
	if !premiere.ReleaseDate.IsZero() {
		releaseDate = premiere.ReleaseDate
	} else {
		releaseDate = nil
	}

	err := r.db.QueryRow(
		query,
		premiere.ID,
		movieID,
		premiere.Title,
		premiere.Description,
		premiere.PosterURL,
		releaseDate,
		premiere.IsActive,
		premiere.Position,
	).Scan(&premiere.CreatedAt, &premiere.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create premiere: %w", err)
	}

	return nil
}

func (r *PremiereRepository) Update(id uuid.UUID, req *models.UpdatePremiereRequest) error {
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Title != "" {
		updates = append(updates, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, req.Title)
		argIndex++
	}
	if req.Description != "" {
		updates = append(updates, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, req.Description)
		argIndex++
	}
	if req.PosterURL != "" {
		updates = append(updates, fmt.Sprintf("poster_url = $%d", argIndex))
		args = append(args, req.PosterURL)
		argIndex++
	}
	if req.ReleaseDate != "" {
		releaseDate, err := time.Parse("2006-01-02", req.ReleaseDate)
		if err == nil {
			updates = append(updates, fmt.Sprintf("release_date = $%d", argIndex))
			args = append(args, releaseDate)
			argIndex++
		}
	}
	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *req.IsActive)
		argIndex++
	}
	if req.Position != "" {
		updates = append(updates, fmt.Sprintf("position = $%d", argIndex))
		args = append(args, req.Position)
		argIndex++
	}

	if len(updates) == 0 {
		return nil
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, id)

	setClause := ""
	for i, update := range updates {
		if i > 0 {
			setClause += ", "
		}
		setClause += update
	}

	query := fmt.Sprintf(`
		UPDATE premieres
		SET %s
		WHERE id = $%d
	`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update premiere: %w", err)
	}

	return nil
}

func (r *PremiereRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM premieres WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete premiere: %w", err)
	}
	return nil
}
