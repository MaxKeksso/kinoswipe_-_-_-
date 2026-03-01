package service

import (
	"fmt"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
)

// Интерфейсы репозиториев для MatchService (позволяют подставлять моки в тестах).
type matchRepoInterface interface {
	Exists(roomID, movieID uuid.UUID) (bool, error)
	GetByRoomID(roomID uuid.UUID) ([]models.Match, error)
	Create(match *models.Match) error
	GetByID(id uuid.UUID) (*models.Match, error)
}

type swipeRepoInterface interface {
	GetUserIDsWhoSwipedInRoom(roomID uuid.UUID) ([]uuid.UUID, error)
	GetAllSwipesByMovie(roomID, movieID uuid.UUID) ([]models.Swipe, error)
	GetLikedMovies(roomID uuid.UUID) ([]uuid.UUID, error)
	CountLikesByMovie(roomID, movieID uuid.UUID) (int, error)
	HasUserSwiped(userID, roomID, movieID uuid.UUID) (bool, error)
	GetUserSwipes(userID, roomID uuid.UUID) ([]models.Swipe, error)
}

type roomRepoInterface interface {
	GetMembers(roomID uuid.UUID) ([]models.User, error)
	GetByID(id uuid.UUID) (*models.Room, error)
}

type movieRepoInterface interface {
	GetByID(id uuid.UUID) (*models.Movie, error)
}

// MatchServiceInterface — интерфейс для тестов и подмены.
type MatchServiceInterface interface {
	CheckAndCreateMatch(roomID, movieID uuid.UUID) (*models.Match, error)
	GetMatchWithDetails(matchID uuid.UUID) (*models.MatchWithDetails, error)
	GetAlmostMatches(roomID uuid.UUID) ([]models.AlmostMatch, error)
}

type MatchService struct {
	matchRepo matchRepoInterface
	swipeRepo swipeRepoInterface
	roomRepo  roomRepoInterface
	movieRepo movieRepoInterface
}

// Проверка, что MatchService реализует интерфейс.
var _ MatchServiceInterface = (*MatchService)(nil)

func NewMatchService(
	matchRepo *repository.MatchRepository,
	swipeRepo *repository.SwipeRepository,
	roomRepo *repository.RoomRepository,
	movieRepo *repository.MovieRepository,
	userRepo *repository.UserRepository,
) *MatchService {
	return &MatchService{
		matchRepo: matchRepo,
		swipeRepo: swipeRepo,
		roomRepo:  roomRepo,
		movieRepo: movieRepo,
	}
}

// CheckAndCreateMatch проверяет, все ли активные участники комнаты (сделавшие хотя бы один свайп) лайкнули фильм, и создаёт матч.
// Неактивные (никогда не свайпавшие) в расчёт не берутся.
func (s *MatchService) CheckAndCreateMatch(roomID, movieID uuid.UUID) (*models.Match, error) {
	activeMemberIDs, err := s.swipeRepo.GetUserIDsWhoSwipedInRoom(roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active members: %w", err)
	}
	// Матч возможен только если хотя бы 2 человека активны в комнате
	if len(activeMemberIDs) < 2 {
		return nil, nil
	}

	// Уникальные пользователи, лайкнувшие этот фильм в этой комнате
	uniqueUserLikes := make(map[uuid.UUID]bool)
	allSwipes, err := s.swipeRepo.GetAllSwipesByMovie(roomID, movieID)
	if err != nil {
		return nil, fmt.Errorf("failed to get swipes: %w", err)
	}
	for _, swipe := range allSwipes {
		if swipe.Direction == models.SwipeDirectionRight {
			uniqueUserLikes[swipe.UserID] = true
		}
	}

	// Матч только если каждый активный участник лайкнул фильм
	if len(uniqueUserLikes) < len(activeMemberIDs) {
		return nil, nil
	}
	for _, id := range activeMemberIDs {
		if !uniqueUserLikes[id] {
			return nil, nil
		}
	}

	// Идемпотентность
	exists, err := s.matchRepo.Exists(roomID, movieID)
	if err != nil {
		return nil, fmt.Errorf("failed to check match existence: %w", err)
	}
	if exists {
		matches, err := s.matchRepo.GetByRoomID(roomID)
		if err != nil {
			return nil, fmt.Errorf("failed to get matches: %w", err)
		}
		for _, m := range matches {
			if m.MovieID == movieID {
				return &m, nil
			}
		}
	}

	match := &models.Match{
		ID:      uuid.New(),
		RoomID:  roomID,
		MovieID: movieID,
	}
	if err := s.matchRepo.Create(match); err != nil {
		return nil, fmt.Errorf("failed to create match: %w", err)
	}
	return match, nil
}

// GetAlmostMatches возвращает фильмы, которые лайкнули все активные участники кроме одного (N-1).
func (s *MatchService) GetAlmostMatches(roomID uuid.UUID) ([]models.AlmostMatch, error) {
	activeMemberIDs, err := s.swipeRepo.GetUserIDsWhoSwipedInRoom(roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active members: %w", err)
	}
	n := len(activeMemberIDs)
	if n <= 1 {
		return nil, nil
	}

	likedMovieIDs, err := s.swipeRepo.GetLikedMovies(roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get liked movies: %w", err)
	}

	existingMatchMovieIDs := make(map[uuid.UUID]bool)
	matches, _ := s.matchRepo.GetByRoomID(roomID)
	for _, m := range matches {
		existingMatchMovieIDs[m.MovieID] = true
	}

	var result []models.AlmostMatch
	for _, movieID := range likedMovieIDs {
		if existingMatchMovieIDs[movieID] {
			continue
		}
		count, err := s.swipeRepo.CountLikesByMovie(roomID, movieID)
		if err != nil || count != n-1 {
			continue
		}
		movie, err := s.movieRepo.GetByID(movieID)
		if err != nil {
			continue
		}
		// Кто не лайкнул (один человек)
		allSwipes, _ := s.swipeRepo.GetAllSwipesByMovie(roomID, movieID)
		whoLiked := make(map[uuid.UUID]bool)
		for _, sw := range allSwipes {
			if sw.Direction == models.SwipeDirectionRight {
				whoLiked[sw.UserID] = true
			}
		}
		var missingUserID uuid.UUID
		for _, uid := range activeMemberIDs {
			if !whoLiked[uid] {
				missingUserID = uid
				break
			}
		}
		result = append(result, models.AlmostMatch{
			MovieID:       movieID,
			Movie:         movie,
			LikesCount:    n - 1,
			MissingUserID: &missingUserID,
		})
	}
	return result, nil
}

// GetMatchWithDetails получает матч с полной информацией
func (s *MatchService) GetMatchWithDetails(matchID uuid.UUID) (*models.MatchWithDetails, error) {
	match, err := s.matchRepo.GetByID(matchID)
	if err != nil {
		return nil, fmt.Errorf("failed to get match: %w", err)
	}

	room, err := s.roomRepo.GetByID(match.RoomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	movie, err := s.movieRepo.GetByID(match.MovieID)
	if err != nil {
		return nil, fmt.Errorf("failed to get movie: %w", err)
	}

	members, err := s.roomRepo.GetMembers(match.RoomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get members: %w", err)
	}

	var users []models.User
	for _, member := range members {
		hasSwiped, err := s.swipeRepo.HasUserSwiped(member.ID, match.RoomID, match.MovieID)
		if err == nil && hasSwiped {
			swipes, _ := s.swipeRepo.GetUserSwipes(member.ID, match.RoomID)
			for _, swipe := range swipes {
				if swipe.MovieID == match.MovieID && swipe.Direction == models.SwipeDirectionRight {
					users = append(users, member)
					break
				}
			}
		}
	}

	return &models.MatchWithDetails{
		Match: *match,
		Movie: *movie,
		Room:  *room,
		Users: users,
	}, nil
}
