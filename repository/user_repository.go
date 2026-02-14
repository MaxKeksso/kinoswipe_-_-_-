package repository

import (
	"database/sql"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	query := `
		INSERT INTO users (id, email, phone, username, avatar_url, password_hash, user_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`
	
	// Преобразуем пустые строки в NULL для email, phone и avatar_url
	var email sql.NullString
	var phone sql.NullString
	var avatarURL sql.NullString
	var passwordHash sql.NullString
	
	if user.Email != "" {
		email = sql.NullString{String: user.Email, Valid: true}
	}
	if user.Phone != "" {
		phone = sql.NullString{String: user.Phone, Valid: true}
	}
	if user.AvatarURL != "" {
		avatarURL = sql.NullString{String: user.AvatarURL, Valid: true}
	}
	if user.PasswordHash != "" {
		passwordHash = sql.NullString{String: user.PasswordHash, Valid: true}
	}
	
	err := r.db.QueryRow(
		query,
		user.ID,
		email,
		phone,
		user.Username,
		avatarURL,
		passwordHash,
		user.UserType,
	).Scan(&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *UserRepository) GetByID(id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, phone, username, avatar_url, password_hash, user_type, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var email, phone, avatarURL, passwordHash sql.NullString

	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&email,
		&phone,
		&user.Username,
		&avatarURL,
		&passwordHash,
		&user.UserType,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Преобразуем NullString в обычные строки
	if email.Valid {
		user.Email = email.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}
	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}
	if passwordHash.Valid {
		user.PasswordHash = passwordHash.String
	}

	return user, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, phone, username, avatar_url, password_hash, user_type, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var emailVal, phone, avatarURL, passwordHash sql.NullString

	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&emailVal,
		&phone,
		&user.Username,
		&avatarURL,
		&passwordHash,
		&user.UserType,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	// Преобразуем NullString в обычные строки
	if emailVal.Valid {
		user.Email = emailVal.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}
	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}
	if passwordHash.Valid {
		user.PasswordHash = passwordHash.String
	}

	return user, nil
}

func (r *UserRepository) Update(id uuid.UUID, req *models.UpdateUserRequest) error {
	query := `
		UPDATE users
		SET username = COALESCE($1, username),
		    avatar_url = COALESCE($2, avatar_url),
		    updated_at = NOW()
		WHERE id = $3
	`

	_, err := r.db.Exec(query, req.Username, req.AvatarURL, id)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

