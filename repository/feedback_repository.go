package repository

import (
	"database/sql"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type FeedbackRepository struct {
	db *sql.DB
}

func NewFeedbackRepository(db *sql.DB) *FeedbackRepository {
	return &FeedbackRepository{db: db}
}

func (r *FeedbackRepository) Create(feedback *models.Feedback) error {
	query := `
		INSERT INTO feedbacks (id, user_id, room_id, match_id, time_spent, had_arguments, rating, comment)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at
	`

	err := r.db.QueryRow(
		query,
		feedback.ID,
		feedback.UserID,
		feedback.RoomID,
		feedback.MatchID,
		feedback.TimeSpent,
		feedback.HadArguments,
		feedback.Rating,
		feedback.Comment,
	).Scan(&feedback.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create feedback: %w", err)
	}

	return nil
}

func (r *FeedbackRepository) GetByID(id uuid.UUID) (*models.Feedback, error) {
	feedback := &models.Feedback{}
	query := `
		SELECT id, user_id, room_id, match_id, time_spent, had_arguments, rating, comment, created_at
		FROM feedbacks
		WHERE id = $1
	`

	var userID, roomID, matchID sql.NullString
	var timeSpent sql.NullInt64

	err := r.db.QueryRow(query, id).Scan(
		&feedback.ID,
		&userID,
		&roomID,
		&matchID,
		&timeSpent,
		&feedback.HadArguments,
		&feedback.Rating,
		&feedback.Comment,
		&feedback.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("feedback not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get feedback: %w", err)
	}

	if userID.Valid {
		id, _ := uuid.Parse(userID.String)
		feedback.UserID = &id
	}
	if roomID.Valid {
		id, _ := uuid.Parse(roomID.String)
		feedback.RoomID = &id
	}
	if matchID.Valid {
		id, _ := uuid.Parse(matchID.String)
		feedback.MatchID = &id
	}
	if timeSpent.Valid {
		t := int(timeSpent.Int64)
		feedback.TimeSpent = &t
	}

	return feedback, nil
}

func (r *FeedbackRepository) GetByRoomID(roomID uuid.UUID) ([]models.Feedback, error) {
	query := `
		SELECT id, user_id, room_id, match_id, time_spent, had_arguments, rating, comment, created_at
		FROM feedbacks
		WHERE room_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get feedbacks: %w", err)
	}
	defer rows.Close()

	var feedbacks []models.Feedback
	for rows.Next() {
		feedback := models.Feedback{}
		var userID, roomID, matchID sql.NullString
		var timeSpent sql.NullInt64

		err := rows.Scan(
			&feedback.ID,
			&userID,
			&roomID,
			&matchID,
			&timeSpent,
			&feedback.HadArguments,
			&feedback.Rating,
			&feedback.Comment,
			&feedback.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan feedback: %w", err)
		}

		if userID.Valid {
			id, _ := uuid.Parse(userID.String)
			feedback.UserID = &id
		}
		if roomID.Valid {
			id, _ := uuid.Parse(roomID.String)
			feedback.RoomID = &id
		}
		if matchID.Valid {
			id, _ := uuid.Parse(matchID.String)
			feedback.MatchID = &id
		}
		if timeSpent.Valid {
			t := int(timeSpent.Int64)
			feedback.TimeSpent = &t
		}

		feedbacks = append(feedbacks, feedback)
	}

	return feedbacks, nil
}

