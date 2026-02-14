package repository

import (
	"database/sql"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type RoomRepository struct {
	db *sql.DB
}

func NewRoomRepository(db *sql.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) Create(room *models.Room) error {
	query := `
		INSERT INTO rooms (id, code, host_id, status, filter_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(
		query,
		room.ID,
		room.Code,
		room.HostID,
		room.Status,
		room.FilterID,
	).Scan(&room.CreatedAt, &room.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create room: %w", err)
	}

	// Автоматически добавляем хоста как участника
	if err := r.AddMember(room.ID, room.HostID); err != nil {
		return fmt.Errorf("failed to add host as member: %w", err)
	}

	return nil
}

func (r *RoomRepository) GetByID(id uuid.UUID) (*models.Room, error) {
	room := &models.Room{}
	var filterID sql.NullString

	query := `
		SELECT id, code, host_id, status, filter_id, created_at, updated_at
		FROM rooms WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&room.ID,
		&room.Code,
		&room.HostID,
		&room.Status,
		&filterID,
		&room.CreatedAt,
		&room.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("room not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	if filterID.Valid {
		fid, _ := uuid.Parse(filterID.String)
		room.FilterID = &fid
	}

	return room, nil
}

func (r *RoomRepository) GetByCode(code string) (*models.Room, error) {
	room := &models.Room{}
	var filterID sql.NullString

	// Поиск без учёта регистра (код может ввести в любом регистре)
	query := `
		SELECT id, code, host_id, status, filter_id, created_at, updated_at
		FROM rooms WHERE UPPER(TRIM(code)) = UPPER(TRIM($1))
	`

	err := r.db.QueryRow(query, code).Scan(
		&room.ID,
		&room.Code,
		&room.HostID,
		&room.Status,
		&filterID,
		&room.CreatedAt,
		&room.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("room not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get room by code: %w", err)
	}

	if filterID.Valid {
		fid, _ := uuid.Parse(filterID.String)
		room.FilterID = &fid
	}

	return room, nil
}

func (r *RoomRepository) GetAll(status *models.RoomStatus, limit int) ([]models.Room, error) {
	var query string
	var args []interface{}

	if status != nil {
		query = `
			SELECT id, code, host_id, status, filter_id, created_at, updated_at
			FROM rooms
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2
		`
		args = []interface{}{*status, limit}
	} else {
		query = `
			SELECT id, code, host_id, status, filter_id, created_at, updated_at
			FROM rooms
			ORDER BY created_at DESC
			LIMIT $1
		`
		args = []interface{}{limit}
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get rooms: %w", err)
	}
	defer rows.Close()

	var rooms []models.Room
	for rows.Next() {
		room := models.Room{}
		var filterID sql.NullString

		err := rows.Scan(
			&room.ID,
			&room.Code,
			&room.HostID,
			&room.Status,
			&filterID,
			&room.CreatedAt,
			&room.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan room: %w", err)
		}

		if filterID.Valid {
			fid, _ := uuid.Parse(filterID.String)
			room.FilterID = &fid
		}

		rooms = append(rooms, room)
	}

	return rooms, nil
}

func (r *RoomRepository) AddMember(roomID, userID uuid.UUID) error {
	query := `
		INSERT INTO room_members (room_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT (room_id, user_id) DO NOTHING
	`

	_, err := r.db.Exec(query, roomID, userID)
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	return nil
}

func (r *RoomRepository) GetMembers(roomID uuid.UUID) ([]models.User, error) {
	query := `
		SELECT u.id, u.email, u.phone, u.username, u.avatar_url, u.user_type, u.created_at, u.updated_at
		FROM users u
		JOIN room_members rm ON u.id = rm.user_id
		WHERE rm.room_id = $1
	`

	rows, err := r.db.Query(query, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get members: %w", err)
	}
	defer rows.Close()

	var members []models.User
	for rows.Next() {
		var user models.User
		var email, phone, avatarURL sql.NullString
		err := rows.Scan(
			&user.ID,
			&email,
			&phone,
			&user.Username,
			&avatarURL,
			&user.UserType,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}
		if email.Valid {
			user.Email = email.String
		}
		if phone.Valid {
			user.Phone = phone.String
		}
		if avatarURL.Valid {
			user.AvatarURL = avatarURL.String
		}
		members = append(members, user)
	}

	return members, nil
}

func (r *RoomRepository) UpdateStatus(roomID uuid.UUID, status models.RoomStatus) error {
	query := `
		UPDATE rooms
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.Exec(query, status, roomID)
	if err != nil {
		return fmt.Errorf("failed to update room status: %w", err)
	}

	return nil
}
