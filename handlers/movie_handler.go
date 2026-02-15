package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type MovieHandler struct {
	movieRepo  *repository.MovieRepository
	roomRepo   *repository.RoomRepository
	filterRepo *repository.FilterRepository
}

func NewMovieHandler(movieRepo *repository.MovieRepository, roomRepo *repository.RoomRepository, filterRepo *repository.FilterRepository) *MovieHandler {
	return &MovieHandler{
		movieRepo:  movieRepo,
		roomRepo:   roomRepo,
		filterRepo: filterRepo,
	}
}

func (h *MovieHandler) GetAllMovies(w http.ResponseWriter, r *http.Request) {
	limit := 1000 // Большой лимит для библиотеки
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	movies, err := h.movieRepo.GetAll(limit)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get movies")
		return
	}
	if movies == nil {
		movies = []models.Movie{}
	}
	respondWithJSON(w, http.StatusOK, movies)
}

func (h *MovieHandler) GetMovie(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	movieID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid movie ID")
		return
	}

	movie, err := h.movieRepo.GetByID(movieID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Movie not found")
		return
	}

	respondWithJSON(w, http.StatusOK, movie)
}

func (h *MovieHandler) GetRoomMovies(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roomID, err := uuid.Parse(vars["room_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		respondWithError(w, http.StatusUnauthorized, "User ID required")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	limit := 100 // По умолчанию
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	// Получаем фильмы, которые пользователь еще не свайпнул
	movies, err := h.movieRepo.GetNotSwipedByUser(roomID, userID, limit)
	if err != nil {
		// Если фильмов нет в базе, возвращаем пустой список
		respondWithJSON(w, http.StatusOK, []models.Movie{})
		return
	}

	// Если фильмов нет, пробуем вернуть все фильмы
	if len(movies) == 0 {
		allMovies, err := h.movieRepo.GetAll(limit)
		if err == nil && len(allMovies) > 0 {
			movies = allMovies
		}
	}

	respondWithJSON(w, http.StatusOK, movies)
}

func (h *MovieHandler) CreateMovie(w http.ResponseWriter, r *http.Request) {
	var movie models.Movie
	if err := json.NewDecoder(r.Body).Decode(&movie); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Валидация обязательных полей
	if movie.Title == "" {
		respondWithError(w, http.StatusBadRequest, "Title is required")
		return
	}
	if movie.PosterURL == "" {
		respondWithError(w, http.StatusBadRequest, "Poster URL is required")
		return
	}
	if movie.Year == 0 {
		respondWithError(w, http.StatusBadRequest, "Year is required")
		return
	}
	if movie.Duration == 0 {
		respondWithError(w, http.StatusBadRequest, "Duration is required")
		return
	}

	movie.ID = uuid.New()
	if err := h.movieRepo.Create(&movie); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create movie")
		return
	}

	respondWithJSON(w, http.StatusCreated, movie)
}

func (h *MovieHandler) UpdateMovie(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	movieID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid movie ID")
		return
	}

	var updates models.Movie
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Получаем существующий фильм
	existingMovie, err := h.movieRepo.GetByID(movieID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Movie not found")
		return
	}

	// Обновляем только переданные поля
	if updates.Title != "" {
		existingMovie.Title = updates.Title
	}
	if updates.TitleEn != "" {
		existingMovie.TitleEn = updates.TitleEn
	}
	if updates.Description != "" {
		existingMovie.Description = updates.Description
	}
	if updates.Year != 0 {
		existingMovie.Year = updates.Year
	}
	if updates.Duration != 0 {
		existingMovie.Duration = updates.Duration
	}
	if updates.KPRating != nil {
		existingMovie.KPRating = updates.KPRating
	}
	if updates.IMDbRating != nil {
		existingMovie.IMDbRating = updates.IMDbRating
	}
	if updates.PosterURL != "" {
		existingMovie.PosterURL = updates.PosterURL
	}
	if updates.TrailerURL != "" {
		existingMovie.TrailerURL = updates.TrailerURL
	}

	if err := h.movieRepo.Update(existingMovie); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update movie")
		return
	}

	respondWithJSON(w, http.StatusOK, existingMovie)
}
