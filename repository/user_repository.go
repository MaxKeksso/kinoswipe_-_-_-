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

func (r *UserRepository) GetByPhone(phone string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, phone, username, avatar_url, password_hash, user_type, created_at, updated_at
		FROM users
		WHERE phone = $1
	`

	var emailVal, phoneVal, avatarURL, passwordHash sql.NullString

	err := r.db.QueryRow(query, phone).Scan(
		&user.ID,
		&emailVal,
		&phoneVal,
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
		return nil, fmt.Errorf("failed to get user by phone: %w", err)
	}

	// Преобразуем NullString в обычные строки
	if emailVal.Valid {
		user.Email = emailVal.String
	}
	if phoneVal.Valid {
		user.Phone = phoneVal.String
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

// GetStatistics возвращает статистику пользователя
func (r *UserRepository) GetStatistics(userID uuid.UUID) (*models.UserStatistics, error) {
	stats := &models.UserStatistics{}

	// Всего свайпов (просмотренных фильмов)
	err := r.db.QueryRow(`
		SELECT COUNT(*) FROM swipes WHERE user_id = $1
	`, userID).Scan(&stats.TotalSwipes)
	if err != nil {
		return nil, fmt.Errorf("failed to get total swipes: %w", err)
	}

	// Лайкнуто фильмов
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM swipes WHERE user_id = $1 AND direction = 'right'
	`, userID).Scan(&stats.LikedMovies)
	if err != nil {
		return nil, fmt.Errorf("failed to get liked movies: %w", err)
	}

	// Дизлайкнуто фильмов
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM swipes WHERE user_id = $1 AND direction = 'left'
	`, userID).Scan(&stats.DislikedMovies)
	if err != nil {
		return nil, fmt.Errorf("failed to get disliked movies: %w", err)
	}

	// Всего мэтчей (комнаты где пользователь участвовал и был мэтч)
	err = r.db.QueryRow(`
		SELECT COUNT(DISTINCT m.id)
		FROM matches m
		INNER JOIN room_members rm ON m.room_id = rm.room_id
		WHERE rm.user_id = $1
	`, userID).Scan(&stats.TotalMatches)
	if err != nil {
		return nil, fmt.Errorf("failed to get total matches: %w", err)
	}

	// Создано комнат
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM rooms WHERE host_id = $1
	`, userID).Scan(&stats.RoomsCreated)
	if err != nil {
		return nil, fmt.Errorf("failed to get rooms created: %w", err)
	}

	// Присоединился к комнатам (включая созданные)
	err = r.db.QueryRow(`
		SELECT COUNT(DISTINCT room_id) FROM room_members WHERE user_id = $1
	`, userID).Scan(&stats.RoomsJoined)
	if err != nil {
		return nil, fmt.Errorf("failed to get rooms joined: %w", err)
	}

	// Активных комнат (где пользователь участник и статус = 'waiting' или 'active')
	err = r.db.QueryRow(`
		SELECT COUNT(DISTINCT r.id)
		FROM rooms r
		INNER JOIN room_members rm ON r.id = rm.room_id
		WHERE rm.user_id = $1 AND r.status IN ('waiting', 'active')
	`, userID).Scan(&stats.ActiveRooms)
	if err != nil {
		return nil, fmt.Errorf("failed to get active rooms: %w", err)
	}

	// Завершенных комнат
	err = r.db.QueryRow(`
		SELECT COUNT(DISTINCT r.id)
		FROM rooms r
		INNER JOIN room_members rm ON r.id = rm.room_id
		WHERE rm.user_id = $1 AND r.status = 'completed'
	`, userID).Scan(&stats.CompletedRooms)
	if err != nil {
		return nil, fmt.Errorf("failed to get completed rooms: %w", err)
	}

	return stats, nil
}

