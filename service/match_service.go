package service

import (
	"fmt"

	"kinoswipe/models"
	"kinoswipe/repository"

	"github.com/google/uuid"
)

type MatchService struct {
	matchRepo *repository.MatchRepository
	swipeRepo *repository.SwipeRepository
	roomRepo  *repository.RoomRepository
	movieRepo *repository.MovieRepository
	userRepo  *repository.UserRepository
}

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
		userRepo:  userRepo,
	}
}

// CheckAndCreateMatch проверяет, все ли участники комнаты лайкнули фильм, и создает матч
func (s *MatchService) CheckAndCreateMatch(roomID, movieID uuid.UUID) (*models.Match, error) {
	// Получаем всех участников комнаты
	members, err := s.roomRepo.GetMembers(roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get room members: %w", err)
	}

	if len(members) == 0 {
		return nil, fmt.Errorf("room has no members")
	}

	// Проверяем количество лайков для этого фильма от разных пользователей
	likeCount, err := s.swipeRepo.CountLikesByMovie(roomID, movieID)
	if err != nil {
		return nil, fmt.Errorf("failed to count likes: %w", err)
	}

	// Проверяем, что каждый участник комнаты лайкнул этот фильм
	// Для двух пользователей нужно минимум 2 лайка от разных пользователей
	uniqueUserLikes := make(map[uuid.UUID]bool)
	allSwipes, err := s.swipeRepo.GetAllSwipesByMovie(roomID, movieID)
	if err == nil {
		for _, swipe := range allSwipes {
			if swipe.Direction == models.SwipeDirectionRight {
				uniqueUserLikes[swipe.UserID] = true
			}
		}
	}

	// Если все участники комнаты лайкнули фильм, создаем матч
	if len(uniqueUserLikes) >= len(members) && likeCount >= len(members) {
		// Проверяем, не существует ли уже такой матч
		exists, err := s.matchRepo.Exists(roomID, movieID)
		if err != nil {
			return nil, fmt.Errorf("failed to check match existence: %w", err)
		}

		if exists {
			// Матч уже существует, возвращаем его
			matches, err := s.matchRepo.GetByRoomID(roomID)
			if err != nil {
				return nil, fmt.Errorf("failed to get matches: %w", err)
			}

			for _, match := range matches {
				if match.MovieID == movieID {
					return &match, nil
				}
			}
		}

		// Создаем новый матч
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

	return nil, nil // Матч еще не создан
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

	// Получаем пользователей, которые лайкнули этот фильм
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

