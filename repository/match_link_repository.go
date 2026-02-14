package repository

import (
	"database/sql"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type MatchLinkRepository struct {
	db *sql.DB
}

func NewMatchLinkRepository(db *sql.DB) *MatchLinkRepository {
	return &MatchLinkRepository{db: db}
}

func (r *MatchLinkRepository) GetByMatchID(matchID uuid.UUID) ([]*models.MatchLink, error) {
	query := `
		SELECT id, match_id, platform, url, title, created_at, updated_at
		FROM match_links
		WHERE match_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, matchID)
	if err != nil {
		return nil, fmt.Errorf("failed to get match links: %w", err)
	}
	defer rows.Close()

	var links []*models.MatchLink
	for rows.Next() {
		link := &models.MatchLink{}
		err := rows.Scan(
			&link.ID,
			&link.MatchID,
			&link.Platform,
			&link.URL,
			&link.Title,
			&link.CreatedAt,
			&link.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan match link: %w", err)
		}
		links = append(links, link)
	}

	return links, nil
}

func (r *MatchLinkRepository) Create(link *models.MatchLink) error {
	query := `
		INSERT INTO match_links (id, match_id, platform, url, title)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(
		query,
		link.ID,
		link.MatchID,
		link.Platform,
		link.URL,
		link.Title,
	).Scan(&link.CreatedAt, &link.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create match link: %w", err)
	}

	return nil
}
