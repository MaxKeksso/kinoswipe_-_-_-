package repository

import (
	"database/sql"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type SwipeRepository struct {
	db *sql.DB
}

func NewSwipeRepository(db *sql.DB) *SwipeRepository {
	return &SwipeRepository{db: db}
}

func (r *SwipeRepository) Create(swipe *models.Swipe) error {
	query := `
		INSERT INTO swipes (id, user_id, room_id, movie_id, direction)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`

	err := r.db.QueryRow(
		query,
		swipe.ID,
		swipe.UserID,
		swipe.RoomID,
		swipe.MovieID,
		swipe.Direction,
	).Scan(&swipe.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create swipe: %w", err)
	}

	return nil
}

func (r *SwipeRepository) GetLastSwipe(userID, roomID uuid.UUID) (*models.Swipe, error) {
	swipe := &models.Swipe{}
	query := `
		SELECT id, user_id, room_id, movie_id, direction, created_at
		FROM swipes
		WHERE user_id = $1 AND room_id = $2
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(query, userID, roomID).Scan(
		&swipe.ID,
		&swipe.UserID,
		&swipe.RoomID,
		&swipe.MovieID,
		&swipe.Direction,
		&swipe.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no swipes found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last swipe: %w", err)
	}

	return swipe, nil
}

func (r *SwipeRepository) Delete(swipeID uuid.UUID) error {
	query := `DELETE FROM swipes WHERE id = $1`
	_, err := r.db.Exec(query, swipeID)
	if err != nil {
		return fmt.Errorf("failed to delete swipe: %w", err)
	}

	return nil
}

func (r *SwipeRepository) HasUserSwiped(userID, roomID, movieID uuid.UUID) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM swipes WHERE user_id = $1 AND room_id = $2 AND movie_id = $3)`
	err := r.db.QueryRow(query, userID, roomID, movieID).Scan(&exists)
	return exists, err
}

func (r *SwipeRepository) GetLikedMovies(roomID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		SELECT DISTINCT movie_id
		FROM swipes
		WHERE room_id = $1 AND direction = 'right'
	`

	rows, err := r.db.Query(query, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get liked movies: %w", err)
	}
	defer rows.Close()

	var movieIDs []uuid.UUID
	for rows.Next() {
		var movieID uuid.UUID
		if err := rows.Scan(&movieID); err != nil {
			return nil, fmt.Errorf("failed to scan movie_id: %w", err)
		}
		movieIDs = append(movieIDs, movieID)
	}

	return movieIDs, nil
}

func (r *SwipeRepository) CountLikesByMovie(roomID, movieID uuid.UUID) (int, error) {
	var count int
	query := `
		SELECT COUNT(*)
		FROM swipes
		WHERE room_id = $1 AND movie_id = $2 AND direction = 'right'
	`

	err := r.db.QueryRow(query, roomID, movieID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count likes: %w", err)
	}

	return count, nil
}

func (r *SwipeRepository) GetUserSwipes(userID, roomID uuid.UUID) ([]models.Swipe, error) {
	query := `
		SELECT id, user_id, room_id, movie_id, direction, created_at
		FROM swipes
		WHERE user_id = $1 AND room_id = $2
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, userID, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user swipes: %w", err)
	}
	defer rows.Close()

	var swipes []models.Swipe
	for rows.Next() {
		swipe := models.Swipe{}
		err := rows.Scan(
			&swipe.ID,
			&swipe.UserID,
			&swipe.RoomID,
			&swipe.MovieID,
			&swipe.Direction,
			&swipe.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan swipe: %w", err)
		}
		swipes = append(swipes, swipe)
	}

	return swipes, nil
}

func (r *SwipeRepository) GetAllSwipesByMovie(roomID, movieID uuid.UUID) ([]models.Swipe, error) {
	query := `
		SELECT id, user_id, room_id, movie_id, direction, created_at
		FROM swipes
		WHERE room_id = $1 AND movie_id = $2
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, roomID, movieID)
	if err != nil {
		return nil, fmt.Errorf("failed to get swipes by movie: %w", err)
	}
	defer rows.Close()

	var swipes []models.Swipe
	for rows.Next() {
		swipe := models.Swipe{}
		err := rows.Scan(
			&swipe.ID,
			&swipe.UserID,
			&swipe.RoomID,
			&swipe.MovieID,
			&swipe.Direction,
			&swipe.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan swipe: %w", err)
		}
		swipes = append(swipes, swipe)
	}

	return swipes, nil
}

