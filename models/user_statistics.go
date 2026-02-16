package models

// UserStatistics представляет статистику пользователя
type UserStatistics struct {
	TotalSwipes        int `json:"total_swipes"`         // Всего просмотрено фильмов (все свайпы)
	LikedMovies        int `json:"liked_movies"`         // Лайкнуто фильмов
	DislikedMovies     int `json:"disliked_movies"`      // Дизлайкнуто фильмов
	TotalMatches       int `json:"total_matches"`        // Всего мэтчей (участие в комнатах где был мэтч)
	RoomsCreated       int `json:"rooms_created"`        // Создано комнат
	RoomsJoined        int `json:"rooms_joined"`         // Присоединился к комнатам
	ActiveRooms        int `json:"active_rooms"`         // Активных комнат (где пользователь участник)
	CompletedRooms     int `json:"completed_rooms"`      // Завершенных комнат
}
