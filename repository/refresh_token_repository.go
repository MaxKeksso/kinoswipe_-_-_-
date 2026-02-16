package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type RefreshTokenRepository struct {
	db *sql.DB
}

func NewRefreshTokenRepository(db *sql.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	return err
}

func (r *RefreshTokenRepository) GetByTokenHash(tokenHash string) (userID uuid.UUID, expiresAt time.Time, revoked bool, err error) {
	err = r.db.QueryRow(
		`SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	).Scan(&userID, &expiresAt, &revoked)
	return
}

func (r *RefreshTokenRepository) RevokeByTokenHash(tokenHash string) error {
	_, err := r.db.Exec(`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, tokenHash)
	return err
}

func (r *RefreshTokenRepository) RevokeAllForUser(userID uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`, userID)
	return err
}

func (r *RefreshTokenRepository) DeleteExpired(before time.Time) (int64, error) {
	res, err := r.db.Exec(`DELETE FROM refresh_tokens WHERE expires_at < $1`, before)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
