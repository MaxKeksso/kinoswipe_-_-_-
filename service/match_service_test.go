package service

import (
	"errors"
	"testing"

	"kinoswipe/models"

	"github.com/google/uuid"
)

// Mock репозиториев для unit-тестов.

type mockMatchRepo struct {
	exists     map[string]bool
	byRoom     map[uuid.UUID][]models.Match
	created    []models.Match
	getByID    map[uuid.UUID]*models.Match
	createErr  error
	getByIDErr error
}

func (m *mockMatchRepo) Exists(roomID, movieID uuid.UUID) (bool, error) {
	if m.exists != nil {
		k := roomID.String() + ":" + movieID.String()
		if v, ok := m.exists[k]; ok {
			return v, nil
		}
	}
	return false, nil
}

func (m *mockMatchRepo) GetByRoomID(roomID uuid.UUID) ([]models.Match, error) {
	if m.byRoom != nil {
		return m.byRoom[roomID], nil
	}
	return nil, nil
}

func (m *mockMatchRepo) Create(match *models.Match) error {
	if m.createErr != nil {
		return m.createErr
	}
	if m.created != nil {
		m.created = append(m.created, *match)
	}
	return nil
}

func (m *mockMatchRepo) GetByID(id uuid.UUID) (*models.Match, error) {
	if m.getByIDErr != nil {
		return nil, m.getByIDErr
	}
	if m.getByID != nil {
		return m.getByID[id], nil
	}
	return nil, errors.New("match not found")
}

type mockSwipeRepo struct {
	userIDsInRoom map[uuid.UUID][]uuid.UUID
	swipesByMovie map[string][]models.Swipe
	likedMovies   map[uuid.UUID][]uuid.UUID
	likeCount    map[string]int
	hasUserSwiped map[string]bool
	userSwipes   map[string][]models.Swipe
}

func key(roomID, movieID uuid.UUID) string { return roomID.String() + ":" + movieID.String() }
func key3(u, r, m uuid.UUID) string        { return u.String() + ":" + r.String() + ":" + m.String() }
func key2(u, r uuid.UUID) string           { return u.String() + ":" + r.String() }

func (m *mockSwipeRepo) GetUserIDsWhoSwipedInRoom(roomID uuid.UUID) ([]uuid.UUID, error) {
	if m.userIDsInRoom != nil {
		return m.userIDsInRoom[roomID], nil
	}
	return nil, nil
}

func (m *mockSwipeRepo) GetAllSwipesByMovie(roomID, movieID uuid.UUID) ([]models.Swipe, error) {
	if m.swipesByMovie != nil {
		return m.swipesByMovie[key(roomID, movieID)], nil
	}
	return nil, nil
}

func (m *mockSwipeRepo) GetLikedMovies(roomID uuid.UUID) ([]uuid.UUID, error) {
	if m.likedMovies != nil {
		return m.likedMovies[roomID], nil
	}
	return nil, nil
}

func (m *mockSwipeRepo) CountLikesByMovie(roomID, movieID uuid.UUID) (int, error) {
	if m.likeCount != nil {
		if c, ok := m.likeCount[key(roomID, movieID)]; ok {
			return c, nil
		}
	}
	return 0, nil
}

func (m *mockSwipeRepo) HasUserSwiped(userID, roomID, movieID uuid.UUID) (bool, error) {
	if m.hasUserSwiped != nil {
		return m.hasUserSwiped[key3(userID, roomID, movieID)], nil
	}
	return false, nil
}

func (m *mockSwipeRepo) GetUserSwipes(userID, roomID uuid.UUID) ([]models.Swipe, error) {
	if m.userSwipes != nil {
		return m.userSwipes[key2(userID, roomID)], nil
	}
	return nil, nil
}

type mockRoomRepo struct {
	members map[uuid.UUID][]models.User
	rooms   map[uuid.UUID]*models.Room
}

func (m *mockRoomRepo) GetMembers(roomID uuid.UUID) ([]models.User, error) {
	if m.members != nil {
		return m.members[roomID], nil
	}
	return nil, nil
}

func (m *mockRoomRepo) GetByID(id uuid.UUID) (*models.Room, error) {
	if m.rooms != nil {
		return m.rooms[id], nil
	}
	return nil, errors.New("room not found")
}

type mockMovieRepo struct {
	movies map[uuid.UUID]*models.Movie
}

func (m *mockMovieRepo) GetByID(id uuid.UUID) (*models.Movie, error) {
	if m.movies != nil {
		if movie, ok := m.movies[id]; ok {
			return movie, nil
		}
	}
	return nil, errors.New("movie not found")
}

// Тесты CheckAndCreateMatch и GetAlmostMatches.
func TestCheckAndCreateMatch_NoActiveMembers(t *testing.T) {
	roomID := uuid.New()
	movieID := uuid.New()
	swipe := &mockSwipeRepo{
		userIDsInRoom: map[uuid.UUID][]uuid.UUID{roomID: {}},
	}
	ms := &MatchService{swipeRepo: swipe, matchRepo: &mockMatchRepo{}, roomRepo: &mockRoomRepo{}, movieRepo: &mockMovieRepo{}}

	match, err := ms.CheckAndCreateMatch(roomID, movieID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match != nil {
		t.Fatal("expected nil match when no active members")
	}
}

func TestCheckAndCreateMatch_NotAllLiked(t *testing.T) {
	roomID := uuid.New()
	movieID := uuid.New()
	u1, u2 := uuid.New(), uuid.New()
	swipe := &mockSwipeRepo{
		userIDsInRoom: map[uuid.UUID][]uuid.UUID{roomID: {u1, u2}},
		swipesByMovie: map[string][]models.Swipe{
			key(roomID, movieID): {
				{UserID: u1, Direction: models.SwipeDirectionRight},
			},
		},
	}
	ms := &MatchService{swipeRepo: swipe, matchRepo: &mockMatchRepo{}, roomRepo: &mockRoomRepo{}, movieRepo: &mockMovieRepo{}}

	match, err := ms.CheckAndCreateMatch(roomID, movieID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match != nil {
		t.Fatal("expected nil match when not all active members liked")
	}
}

func TestCheckAndCreateMatch_AllLiked_CreatesMatch(t *testing.T) {
	roomID := uuid.New()
	movieID := uuid.New()
	u1, u2 := uuid.New(), uuid.New()
	created := []models.Match{}
	swipe := &mockSwipeRepo{
		userIDsInRoom: map[uuid.UUID][]uuid.UUID{roomID: {u1, u2}},
		swipesByMovie: map[string][]models.Swipe{
			key(roomID, movieID): {
				{UserID: u1, Direction: models.SwipeDirectionRight},
				{UserID: u2, Direction: models.SwipeDirectionRight},
			},
		},
	}
	matchRepo := &mockMatchRepo{created: created}
	ms := &MatchService{swipeRepo: swipe, matchRepo: matchRepo, roomRepo: &mockRoomRepo{}, movieRepo: &mockMovieRepo{}}

	match, err := ms.CheckAndCreateMatch(roomID, movieID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match == nil {
		t.Fatal("expected match when all active members liked")
	}
	if match.RoomID != roomID || match.MovieID != movieID {
		t.Errorf("match room/movie id mismatch: got room=%s movie=%s", match.RoomID, match.MovieID)
	}
	if len(matchRepo.created) != 1 {
		t.Errorf("expected 1 created match, got %d", len(matchRepo.created))
	}
}

func TestGetAlmostMatches_Empty(t *testing.T) {
	roomID := uuid.New()
	swipe := &mockSwipeRepo{
		userIDsInRoom: map[uuid.UUID][]uuid.UUID{roomID: {uuid.New(), uuid.New()}},
		likedMovies:   map[uuid.UUID][]uuid.UUID{roomID: {}},
	}
	ms := &MatchService{swipeRepo: swipe, matchRepo: &mockMatchRepo{}, roomRepo: &mockRoomRepo{}, movieRepo: &mockMovieRepo{}}

	list, err := ms.GetAlmostMatches(roomID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected 0 almost matches, got %d", len(list))
	}
}

func TestGetAlmostMatches_OneAlmostMatch(t *testing.T) {
	roomID := uuid.New()
	movieID := uuid.New()
	u1, u2 := uuid.New(), uuid.New()
	movie := &models.Movie{ID: movieID, Title: "Test"}
	swipe := &mockSwipeRepo{
		userIDsInRoom: map[uuid.UUID][]uuid.UUID{roomID: {u1, u2}},
		likedMovies:   map[uuid.UUID][]uuid.UUID{roomID: {movieID}},
		likeCount:     map[string]int{key(roomID, movieID): 1},
		swipesByMovie: map[string][]models.Swipe{
			key(roomID, movieID): {{UserID: u1, Direction: models.SwipeDirectionRight}},
		},
	}
	ms := &MatchService{
		swipeRepo: swipe,
		matchRepo: &mockMatchRepo{},
		roomRepo:  &mockRoomRepo{},
		movieRepo: &mockMovieRepo{movies: map[uuid.UUID]*models.Movie{movieID: movie}},
	}

	list, err := ms.GetAlmostMatches(roomID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 almost match, got %d", len(list))
	}
	if list[0].MovieID != movieID || list[0].LikesCount != 1 {
		t.Errorf("almost match: movie=%s likes=%d", list[0].MovieID, list[0].LikesCount)
	}
	if list[0].MissingUserID == nil || *list[0].MissingUserID != u2 {
		t.Errorf("expected missing user u2, got %v", list[0].MissingUserID)
	}
}
