package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"kinoswipe/models"

	"github.com/google/uuid"
)

type MovieRepository struct {
	db *sql.DB
}

func NewMovieRepository(db *sql.DB) *MovieRepository {
	return &MovieRepository{db: db}
}

func (r *MovieRepository) Create(movie *models.Movie) error {
	query := `
		INSERT INTO movies (id, title, title_en, poster_url, imdb_rating, kp_rating, genre, year, duration, description, trailer_url, streaming_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING created_at, updated_at
	`

	var titleEn, description, trailerURL sql.NullString
	var streamingURL []byte // JSONB

	if movie.TitleEn != "" {
		titleEn = sql.NullString{String: movie.TitleEn, Valid: true}
	}
	if movie.Description != "" {
		description = sql.NullString{String: movie.Description, Valid: true}
	}
	if movie.TrailerURL != "" {
		trailerURL = sql.NullString{String: movie.TrailerURL, Valid: true}
	}
	if len(movie.StreamingURL) > 0 {
		data, _ := json.Marshal(movie.StreamingURL)
		streamingURL = data
	}
	if streamingURL == nil {
		streamingURL = []byte("null") // JSONB требует валидный JSON или NULL через sql.Null*
	}

	var genre []byte
	if movie.Genre != "" && json.Valid([]byte(movie.Genre)) {
		genre = []byte(movie.Genre)
	}
	if genre == nil {
		genre = []byte("[]") // всегда передаём валидный JSON для JSONB
	}

	err := r.db.QueryRow(
		query,
		movie.ID,
		movie.Title,
		titleEn,
		movie.PosterURL,
		movie.IMDbRating,
		movie.KPRating,
		genre,
		movie.Year,
		movie.Duration,
		description,
		trailerURL,
		streamingURL,
	).Scan(&movie.CreatedAt, &movie.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create movie: %w", err)
	}

	return nil
}

func (r *MovieRepository) GetByID(id uuid.UUID) (*models.Movie, error) {
	movie := &models.Movie{}
	query := `
		SELECT id, title, title_en, poster_url, imdb_rating, kp_rating, genre, year, duration, description, trailer_url, streaming_url, created_at, updated_at
		FROM movies WHERE id = $1
	`

	var titleEn, description, trailerURL, streamingURL sql.NullString
	var genre []byte

	err := r.db.QueryRow(query, id).Scan(
		&movie.ID, &movie.Title, &titleEn, &movie.PosterURL,
		&movie.IMDbRating, &movie.KPRating, &genre, &movie.Year,
		&movie.Duration, &description, &trailerURL, &streamingURL,
		&movie.CreatedAt, &movie.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("movie not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get movie: %w", err)
	}

	if titleEn.Valid {
		movie.TitleEn = titleEn.String
	}
	if description.Valid {
		movie.Description = description.String
	}
	if trailerURL.Valid {
		movie.TrailerURL = trailerURL.String
	}
	if streamingURL.Valid {
		_ = json.Unmarshal([]byte(streamingURL.String), &movie.StreamingURL)
	}
	if len(genre) > 0 {
		// Genre хранится как JSON строка в БД, просто конвертируем в строку
		movie.Genre = string(genre)
	}

	return movie, nil
}

func (r *MovieRepository) Update(movie *models.Movie) error {
	query := `
		UPDATE movies SET
			title = $1, title_en = $2, poster_url = $3, imdb_rating = $4, kp_rating = $5,
			genre = $6, year = $7, duration = $8, description = $9, trailer_url = $10,
			streaming_url = $11, updated_at = CURRENT_TIMESTAMP
		WHERE id = $12
		RETURNING updated_at
	`

	var titleEn, description, trailerURL sql.NullString
	var streamingURL []byte
	if movie.TitleEn != "" {
		titleEn = sql.NullString{String: movie.TitleEn, Valid: true}
	}
	if movie.Description != "" {
		description = sql.NullString{String: movie.Description, Valid: true}
	}
	if movie.TrailerURL != "" {
		trailerURL = sql.NullString{String: movie.TrailerURL, Valid: true}
	}
	if movie.StreamingURL != "" {
		streamingURL = []byte(movie.StreamingURL)
	}
	if streamingURL == nil {
		streamingURL = []byte("null")
	}
	var genre []byte
	if movie.Genre != "" && json.Valid([]byte(movie.Genre)) {
		genre = []byte(movie.Genre)
	}
	if genre == nil {
		genre = []byte("[]")
	}

	err := r.db.QueryRow(query,
		movie.Title, titleEn, movie.PosterURL, movie.IMDbRating, movie.KPRating,
		genre, movie.Year, movie.Duration, description, trailerURL, streamingURL,
		movie.ID,
	).Scan(&movie.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to update movie: %w", err)
	}
	return nil
}

func (r *MovieRepository) GetAll(limit int) ([]models.Movie, error) {
	query := `
		SELECT id, title, title_en, poster_url, imdb_rating, kp_rating, genre, year, duration, description, trailer_url, streaming_url, created_at, updated_at
		FROM movies
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get movies: %w", err)
	}
	defer rows.Close()

	var movies []models.Movie
	for rows.Next() {
		movie := models.Movie{}
		var titleEn, description, trailerURL, streamingURL sql.NullString
		var genre []byte

		err := rows.Scan(
			&movie.ID, &movie.Title, &titleEn, &movie.PosterURL,
			&movie.IMDbRating, &movie.KPRating, &genre, &movie.Year,
			&movie.Duration, &description, &trailerURL, &streamingURL,
			&movie.CreatedAt, &movie.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan movie: %w", err)
		}

		if titleEn.Valid {
			movie.TitleEn = titleEn.String
		}
		if description.Valid {
			movie.Description = description.String
		}
		if trailerURL.Valid {
			movie.TrailerURL = trailerURL.String
		}
		if streamingURL.Valid {
			_ = json.Unmarshal([]byte(streamingURL.String), &movie.StreamingURL)
		}
		if len(genre) > 0 {
			// Genre хранится как JSON строка в БД, просто конвертируем в строку
			movie.Genre = string(genre)
		}

		movies = append(movies, movie)
	}

	return movies, nil
}

func (r *MovieRepository) GetNotSwipedByUser(roomID, userID uuid.UUID, limit int) ([]models.Movie, error) {
	query := `
		SELECT m.id, m.title, m.title_en, m.poster_url, m.imdb_rating, m.kp_rating, m.genre, m.year, m.duration, m.description, m.trailer_url, m.streaming_url, m.created_at, m.updated_at
		FROM movies m
		WHERE NOT EXISTS (
			SELECT 1 FROM swipes s
			WHERE s.movie_id = m.id
			AND s.room_id = $1
			AND s.user_id = $2
		)
		ORDER BY m.created_at DESC
		LIMIT $3
	`

	rows, err := r.db.Query(query, roomID, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get movies: %w", err)
	}
	defer rows.Close()

	var movies []models.Movie
	for rows.Next() {
		movie := models.Movie{}
		var titleEn, description, trailerURL, streamingURL sql.NullString
		var genre []byte

		err := rows.Scan(
			&movie.ID, &movie.Title, &titleEn, &movie.PosterURL,
			&movie.IMDbRating, &movie.KPRating, &genre, &movie.Year,
			&movie.Duration, &description, &trailerURL, &streamingURL,
			&movie.CreatedAt, &movie.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan movie: %w", err)
		}

		if titleEn.Valid {
			movie.TitleEn = titleEn.String
		}
		if description.Valid {
			movie.Description = description.String
		}
		if trailerURL.Valid {
			movie.TrailerURL = trailerURL.String
		}
		if streamingURL.Valid {
			_ = json.Unmarshal([]byte(streamingURL.String), &movie.StreamingURL)
		}
		if len(genre) > 0 {
			// Genre хранится как JSON строка в БД, просто конвертируем в строку
			movie.Genre = string(genre)
		}

		movies = append(movies, movie)
	}

	return movies, nil
}
