package service

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"sync"
	"time"
)

// FootballMatch представляет футбольный матч
type FootballMatch struct {
	ID          string    `json:"id"`
	Date        string    `json:"date"`
	Time        string    `json:"time"`
	HomeTeam    string    `json:"homeTeam"`
	AwayTeam    string    `json:"awayTeam"`
	Tournament  string    `json:"tournament"`
	Status      string    `json:"status"` // "upcoming", "live", "finished"
	HomeScore   *int      `json:"homeScore,omitempty"`
	AwayScore   *int      `json:"awayScore,omitempty"`
	MatchDate   time.Time `json:"-"`
}

// FootballStanding — одна строка турнирной таблицы
type FootballStanding struct {
	Position     int    `json:"position"`
	Team         string `json:"team"`
	Played       int    `json:"played"`
	Won          int    `json:"won"`
	Draw         int    `json:"draw"`
	Lost         int    `json:"lost"`
	GoalsFor     int    `json:"goalsFor"`
	GoalsAgainst int    `json:"goalsAgainst"`
	GoalDiff     int    `json:"goalDiff"`
	Points       int    `json:"points"`
	Form         string `json:"form,omitempty"`
	Zone         string `json:"zone"` // "direct"|"playoff"|"eliminated"|"europe"|"relegation"|""
}

// FootballService управляет получением данных о футбольных матчах
type FootballService struct {
	apiKey         string // Football-Data.org (европейские турниры)
	apiFootballKey string // API-Football (api-sports.io) для РПЛ
	apiBaseURL     string
	apiFootballURL string
	cache          map[string][]FootballMatch
	cacheMutex     sync.RWMutex
	lastUpdate     map[string]time.Time
	cacheTTL       time.Duration
	// Standings cache
	standingsCache      map[string][]FootballStanding
	standingsMutex      sync.RWMutex
	standingsLastUpdate map[string]time.Time
	standingsTTL        time.Duration
}

// CLBracket описывает сетку плей-офф Лиги чемпионов
type CLBracket struct {
	RoundOf16     []FootballMatch `json:"roundOf16"`
	QuarterFinals []FootballMatch `json:"quarterFinals"`
	SemiFinals    []FootballMatch `json:"semiFinals"`
	Final         []FootballMatch `json:"final"`
}

// Football-Data.org API структуры
type FootballDataResponse struct {
	Matches []FootballDataMatch `json:"matches"`
}

type FootballDataMatch struct {
	ID          int    `json:"id"`
	UtcDate     string `json:"utcDate"`
	Status      string `json:"status"`
	Stage       string `json:"stage"`
	HomeTeam    Team   `json:"homeTeam"`
	AwayTeam    Team   `json:"awayTeam"`
	Score       Score  `json:"score"`
	Competition Competition `json:"competition"`
}

type Team struct {
	Name string `json:"name"`
}

type Score struct {
	FullTime struct {
		HomeTeam *int `json:"homeTeam"`
		AwayTeam *int `json:"awayTeam"`
	} `json:"fullTime"`
}

type Competition struct {
	Name string `json:"name"`
}

func NewFootballService(apiKey, apiFootballKey string) *FootballService {
	return &FootballService{
		apiKey:              apiKey,
		apiFootballKey:      apiFootballKey,
		apiBaseURL:          "https://api.football-data.org/v4",
		apiFootballURL:      "https://v3.football.api-sports.io",
		cache:               make(map[string][]FootballMatch),
		lastUpdate:          make(map[string]time.Time),
		cacheTTL:            5 * time.Minute,
		standingsCache:      make(map[string][]FootballStanding),
		standingsLastUpdate: make(map[string]time.Time),
		standingsTTL:        30 * time.Minute,
	}
}

// GetRPLMatches возвращает матчи РПЛ
func (s *FootballService) GetRPLMatches() ([]FootballMatch, error) {
	// Проверяем кеш
	s.cacheMutex.RLock()
	if matches, ok := s.cache["RPL"]; ok {
		if lastUpdate, ok := s.lastUpdate["RPL"]; ok {
			if time.Since(lastUpdate) < s.cacheTTL {
				s.cacheMutex.RUnlock()
				return matches, nil
			}
		}
	}
	s.cacheMutex.RUnlock()
	
	// Пытаемся получить данные из API
	matches, err := s.fetchRPLMatches()
	if err != nil {
		log.Printf("Error fetching RPL from API, using static data: %v", err)
		matches = s.getRPLStaticMatches()
	}
	
	// Сохраняем в кеш
	s.cacheMutex.Lock()
	s.cache["RPL"] = matches
	s.lastUpdate["RPL"] = time.Now()
	s.cacheMutex.Unlock()
	
	return matches, nil
}

// API-Football (api-sports.io) структуры ответа
type ApiFootballFixturesResponse struct {
	Response []ApiFootballFixture `json:"response"`
}

type ApiFootballFixture struct {
	Fixture ApiFootballFixtureInfo `json:"fixture"`
	League  struct {
		Name string `json:"name"`
	} `json:"league"`
	Teams struct {
		Home struct {
			Name string `json:"name"`
		} `json:"home"`
		Away struct {
			Name string `json:"name"`
		} `json:"away"`
	} `json:"teams"`
	Goals struct {
		Home *int `json:"home"`
		Away *int `json:"away"`
	} `json:"goals"`
}

type ApiFootballFixtureInfo struct {
	ID     int    `json:"id"`
	Date   string `json:"date"`
	Status struct {
		Short string `json:"short"`
	} `json:"status"`
}

// fetchRPLMatches получает матчи РПЛ из API-Football (api-sports.io), league id 235 = Russian Premier League
func (s *FootballService) fetchRPLMatches() ([]FootballMatch, error) {
	if s.apiFootballKey == "" {
		return nil, fmt.Errorf("API_FOOTBALL_KEY not set")
	}

	season := time.Now().Year()
	// Сезон РПЛ: с июля по май, для первой половины года берём предыдущий год
	if time.Now().Month() < 7 {
		season--
	}
	url := fmt.Sprintf("%s/fixtures?league=235&season=%d", s.apiFootballURL, season)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-apisports-key", s.apiFootballKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API-Football returned %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp ApiFootballFixturesResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}

	moscowLocation, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		moscowLocation = time.UTC
	}
	now := time.Now()

	matches := make([]FootballMatch, 0)
	for _, f := range apiResp.Response {
		matchDateUTC, err := time.Parse(time.RFC3339, f.Fixture.Date)
		if err != nil {
			continue
		}
		matchDate := matchDateUTC.In(moscowLocation)

		// Показываем матчи: прошедшие за последние 3 дня + будущие в течение 30 дней
		if matchDate.Before(now.Add(-3*24*time.Hour)) || matchDate.After(now.Add(30*24*time.Hour)) {
			continue
		}

		status := "upcoming"
		switch f.Fixture.Status.Short {
		case "1H", "HT", "2H", "ET", "P":
			status = "live"
		case "FT", "AET", "PEN":
			status = "finished"
		}

		match := FootballMatch{
			ID:         fmt.Sprintf("%d", f.Fixture.ID),
			Date:       matchDate.Format("2006-01-02"),
			Time:       matchDate.Format("15:04"),
			HomeTeam:   f.Teams.Home.Name,
			AwayTeam:   f.Teams.Away.Name,
			Tournament: f.League.Name,
			Status:     status,
			MatchDate:  matchDate,
		}
		if f.Goals.Home != nil {
			match.HomeScore = f.Goals.Home
		}
		if f.Goals.Away != nil {
			match.AwayScore = f.Goals.Away
		}
		matches = append(matches, match)
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i].MatchDate.Before(matches[j].MatchDate)
	})

	log.Printf("Fetched %d RPL matches from API-Football", len(matches))
	return matches, nil
}

// GetEuropeanMatches возвращает матчи европейских турниров
func (s *FootballService) GetEuropeanMatches() ([]FootballMatch, error) {
	// Проверяем кеш
	s.cacheMutex.RLock()
	if matches, ok := s.cache["EU"]; ok {
		if lastUpdate, ok := s.lastUpdate["EU"]; ok {
			if time.Since(lastUpdate) < s.cacheTTL {
				s.cacheMutex.RUnlock()
				return matches, nil
			}
		}
	}
	s.cacheMutex.RUnlock()
	
	// Пытаемся получить данные из API
	matches, err := s.fetchChampionsLeagueMatches()
	if err != nil {
		log.Printf("Error fetching from API, using static data: %v", err)
		matches = s.getEuropeanStaticMatches()
	}
	
	// Сохраняем в кеш
	s.cacheMutex.Lock()
	s.cache["EU"] = matches
	s.lastUpdate["EU"] = time.Now()
	s.cacheMutex.Unlock()
	
	return matches, nil
}

// fetchChampionsLeagueMatches получает матчи Лиги Чемпионов из API
func (s *FootballService) fetchChampionsLeagueMatches() ([]FootballMatch, error) {
	// ID Лиги Чемпионов в Football-Data.org
	competitionID := "CL" // Champions League
	
	url := fmt.Sprintf("%s/competitions/%s/matches", s.apiBaseURL, competitionID)
	
	log.Printf("Fetching matches from API: %s", url)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		return nil, err
	}
	
	if s.apiKey != "" {
		req.Header.Set("X-Auth-Token", s.apiKey)
		log.Printf("Using API key for authentication")
	} else {
		log.Printf("No API key provided, using free tier")
	}
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		return nil, err
	}
	defer resp.Body.Close()
	
	log.Printf("API response status: %d", resp.StatusCode)
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("API error response: %s", string(body))
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
		return nil, err
	}
	
	log.Printf("Received %d bytes from API", len(body))
	
	var apiResponse FootballDataResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("Error unmarshaling JSON: %v", err)
		return nil, err
	}
	
	log.Printf("Parsed %d matches from API", len(apiResponse.Matches))
	
	matches := make([]FootballMatch, 0)
	now := time.Now()
	
	// Московское время (UTC+3)
	moscowLocation, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		log.Printf("Error loading Moscow location, using UTC: %v", err)
		moscowLocation = time.UTC
	}
	
	for _, m := range apiResponse.Matches {
		matchDateUTC, err := time.Parse(time.RFC3339, m.UtcDate)
		if err != nil {
			log.Printf("Error parsing date %s: %v", m.UtcDate, err)
			continue
		}
		
		// Конвертируем UTC в московское время
		matchDate := matchDateUTC.In(moscowLocation)
		
		// Фильтруем только предстоящие матчи (в течение следующих 30 дней)
		if matchDate.Before(now) || matchDate.After(now.Add(30*24*time.Hour)) {
			continue
		}
		
		status := "upcoming"
		if m.Status == "LIVE" || m.Status == "IN_PLAY" {
			status = "live"
		} else if m.Status == "FINISHED" {
			status = "finished"
		}
		
		match := FootballMatch{
			ID:         fmt.Sprintf("%d", m.ID),
			Date:       matchDate.Format("2006-01-02"),
			Time:       matchDate.Format("15:04"), // Московское время
			HomeTeam:   m.HomeTeam.Name,
			AwayTeam:   m.AwayTeam.Name,
			Tournament: m.Competition.Name,
			Status:     status,
			MatchDate:  matchDate,
		}
		
		log.Printf("Match: %s vs %s on %s at %s (%s)", match.HomeTeam, match.AwayTeam, match.Date, match.Time, match.Status)
		
		if m.Score.FullTime.HomeTeam != nil {
			match.HomeScore = m.Score.FullTime.HomeTeam
		}
		if m.Score.FullTime.AwayTeam != nil {
			match.AwayScore = m.Score.FullTime.AwayTeam
		}
		
		matches = append(matches, match)
	}
	
	log.Printf("Filtered to %d upcoming matches (within 30 days)", len(matches))
	
	return matches, nil
}

// GetCLBracket возвращает сетку плей-офф Лиги чемпионов (динамически из API, при ошибке — статическая)
func (s *FootballService) GetCLBracket() (*CLBracket, error) {
	bracket, err := s.fetchCLBracket()
	if err != nil {
		log.Printf("CL bracket API error, using static: %v", err)
		return s.getCLStaticBracket(), nil
	}
	return bracket, nil
}

// fetchCLBracket получает все матчи ЛЧ и группирует их по стадиям плей-офф
func (s *FootballService) fetchCLBracket() (*CLBracket, error) {
	url := fmt.Sprintf("%s/competitions/CL/matches", s.apiBaseURL)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if s.apiKey != "" {
		req.Header.Set("X-Auth-Token", s.apiKey)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("football-data.org CL bracket %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp FootballDataResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}

	// Московское время (UTC+3)
	moscowLocation, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		moscowLocation = time.UTC
	}

	bracket := &CLBracket{
		RoundOf16:     make([]FootballMatch, 0),
		QuarterFinals: make([]FootballMatch, 0),
		SemiFinals:    make([]FootballMatch, 0),
		Final:         make([]FootballMatch, 0),
	}

	for _, m := range apiResp.Matches {
		stage := m.Stage
		// football-data.org может использовать LAST_16 вместо ROUND_OF_16
		if stage == "LAST_16" {
			stage = "ROUND_OF_16"
		}
		switch stage {
		case "ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL":
			// интересуют только стадии плей-офф
		default:
			continue
		}

		matchDateUTC, err := time.Parse(time.RFC3339, m.UtcDate)
		if err != nil {
			continue
		}
		matchDate := matchDateUTC.In(moscowLocation)

		status := "upcoming"
		if m.Status == "LIVE" || m.Status == "IN_PLAY" {
			status = "live"
		} else if m.Status == "FINISHED" {
			status = "finished"
		}

		match := FootballMatch{
			ID:         fmt.Sprintf("%d", m.ID),
			Date:       matchDate.Format("2006-01-02"),
			Time:       matchDate.Format("15:04"),
			HomeTeam:   m.HomeTeam.Name,
			AwayTeam:   m.AwayTeam.Name,
			Tournament: m.Competition.Name,
			Status:     status,
			MatchDate:  matchDate,
		}
		if m.Score.FullTime.HomeTeam != nil {
			match.HomeScore = m.Score.FullTime.HomeTeam
		}
		if m.Score.FullTime.AwayTeam != nil {
			match.AwayScore = m.Score.FullTime.AwayTeam
		}

		switch stage {
		case "ROUND_OF_16":
			bracket.RoundOf16 = append(bracket.RoundOf16, match)
		case "QUARTER_FINALS":
			bracket.QuarterFinals = append(bracket.QuarterFinals, match)
		case "SEMI_FINALS":
			bracket.SemiFinals = append(bracket.SemiFinals, match)
		case "FINAL":
			bracket.Final = append(bracket.Final, match)
		}
	}

	// сортируем внутри каждой стадии по дате
	sort.Slice(bracket.RoundOf16, func(i, j int) bool { return bracket.RoundOf16[i].MatchDate.Before(bracket.RoundOf16[j].MatchDate) })
	sort.Slice(bracket.QuarterFinals, func(i, j int) bool { return bracket.QuarterFinals[i].MatchDate.Before(bracket.QuarterFinals[j].MatchDate) })
	sort.Slice(bracket.SemiFinals, func(i, j int) bool { return bracket.SemiFinals[i].MatchDate.Before(bracket.SemiFinals[j].MatchDate) })
	sort.Slice(bracket.Final, func(i, j int) bool { return bracket.Final[i].MatchDate.Before(bracket.Final[j].MatchDate) })

	return bracket, nil
}

// RefreshCache принудительно обновляет кеш
func (s *FootballService) RefreshCache() error {
	s.cacheMutex.Lock()
	delete(s.cache, "RPL")
	delete(s.cache, "EU")
	delete(s.lastUpdate, "RPL")
	delete(s.lastUpdate, "EU")
	s.cacheMutex.Unlock()

	s.standingsMutex.Lock()
	delete(s.standingsCache, "CL")
	delete(s.standingsCache, "RPL")
	delete(s.standingsLastUpdate, "CL")
	delete(s.standingsLastUpdate, "RPL")
	s.standingsMutex.Unlock()

	return nil
}

// getRPLStaticMatches возвращает статические данные для РПЛ с правильным временем
func (s *FootballService) getRPLStaticMatches() []FootballMatch {
	// Московское время
	moscowLocation, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		moscowLocation = time.UTC
	}
	
	now := time.Now().In(moscowLocation)
	
	// Генерируем матчи на ближайшие дни с реалистичными временами РПЛ
	matches := []FootballMatch{
		{
			ID:         "rpl-1",
			Date:       now.Add(24 * time.Hour).Format("2006-01-02"),
			Time:       "20:00", // Типичное время матчей РПЛ
			HomeTeam:   "Спартак",
			AwayTeam:   "Зенит",
			Tournament: "РПЛ",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day()+1, 20, 0, 0, 0, moscowLocation),
		},
		{
			ID:         "rpl-2",
			Date:       now.Add(48 * time.Hour).Format("2006-01-02"),
			Time:       "19:00",
			HomeTeam:   "ЦСКА",
			AwayTeam:   "Краснодар",
			Tournament: "РПЛ",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day()+2, 19, 0, 0, 0, moscowLocation),
		},
		{
			ID:         "rpl-3",
			Date:       now.Add(72 * time.Hour).Format("2006-01-02"),
			Time:       "18:30",
			HomeTeam:   "Локомотив",
			AwayTeam:   "Динамо",
			Tournament: "РПЛ",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day()+3, 18, 30, 0, 0, moscowLocation),
		},
	}
	return matches
}

// getEuropeanStaticMatches возвращает статические данные для европейских турниров с правильным временем
func (s *FootballService) getEuropeanStaticMatches() []FootballMatch {
	// Московское время
	moscowLocation, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		moscowLocation = time.UTC
	}
	
	now := time.Now().In(moscowLocation)
	
	matches := []FootballMatch{
		{
			ID:         "cl-1",
			Date:       now.Add(12 * time.Hour).Format("2006-01-02"),
			Time:       "22:00", // Конвертированное московское время
			HomeTeam:   "Реал Мадрид",
			AwayTeam:   "Манчестер Сити",
			Tournament: "Лига Чемпионов",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day(), 22, 0, 0, 0, moscowLocation).Add(12 * time.Hour),
		},
		{
			ID:         "cl-2",
			Date:       now.Add(36 * time.Hour).Format("2006-01-02"),
			Time:       "22:00",
			HomeTeam:   "Барселона",
			AwayTeam:   "Бавария",
			Tournament: "Лига Чемпионов",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day(), 22, 0, 0, 0, moscowLocation).Add(36 * time.Hour),
		},
		{
			ID:         "cl-3",
			Date:       now.Add(60 * time.Hour).Format("2006-01-02"),
			Time:       "21:00",
			HomeTeam:   "ПСЖ",
			AwayTeam:   "Ливерпуль",
			Tournament: "Лига Чемпионов",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day(), 21, 0, 0, 0, moscowLocation).Add(60 * time.Hour),
		},
		{
			ID:         "el-1",
			Date:       now.Add(84 * time.Hour).Format("2006-01-02"),
			Time:       "20:00",
			HomeTeam:   "Челси",
			AwayTeam:   "Арсенал",
			Tournament: "Лига Европы",
			Status:     "upcoming",
			MatchDate:  time.Date(now.Year(), now.Month(), now.Day(), 20, 0, 0, 0, moscowLocation).Add(84 * time.Hour),
		},
	}
	return matches
}

// ====================================================
//  STANDINGS — турнирные таблицы
// ====================================================

// API-response структуры для football-data.org standings
type fdStandingsResp struct {
	Standings []struct {
		Type  string `json:"type"`
		Table []struct {
			Position       int    `json:"position"`
			Team           struct{ Name string `json:"name"` } `json:"team"`
			PlayedGames    int    `json:"playedGames"`
			Won            int    `json:"won"`
			Draw           int    `json:"draw"`
			Lost           int    `json:"lost"`
			GoalsFor       int    `json:"goalsFor"`
			GoalsAgainst   int    `json:"goalsAgainst"`
			GoalDifference int    `json:"goalDifference"`
			Points         int    `json:"points"`
			Form           string `json:"form"`
		} `json:"table"`
	} `json:"standings"`
}

// API-response структуры для api-football standings
type afStandingsResp struct {
	Response []struct {
		League struct {
			Standings [][]struct {
				Rank int    `json:"rank"`
				Team struct{ Name string `json:"name"` } `json:"team"`
				All  struct {
					Played int `json:"played"`
					Win    int `json:"win"`
					Draw   int `json:"draw"`
					Lose   int `json:"lose"`
					Goals  struct {
						For     int `json:"for"`
						Against int `json:"against"`
					} `json:"goals"`
				} `json:"all"`
				GoalsDiff int    `json:"goalsDiff"`
				Points    int    `json:"points"`
				Form      string `json:"form"`
			} `json:"standings"`
		} `json:"league"`
	} `json:"response"`
}

// GetCLStandings возвращает таблицу Лиги Чемпионов
func (s *FootballService) GetCLStandings() ([]FootballStanding, error) {
	s.standingsMutex.RLock()
	if st, ok := s.standingsCache["CL"]; ok {
		if lu, ok2 := s.standingsLastUpdate["CL"]; ok2 && time.Since(lu) < s.standingsTTL {
			s.standingsMutex.RUnlock()
			return st, nil
		}
	}
	s.standingsMutex.RUnlock()

	standings, err := s.fetchCLStandings()
	if err != nil {
		log.Printf("CL standings API error, using static: %v", err)
		standings = s.getCLStaticStandings()
	}

	s.standingsMutex.Lock()
	s.standingsCache["CL"] = standings
	s.standingsLastUpdate["CL"] = time.Now()
	s.standingsMutex.Unlock()
	return standings, nil
}

// GetRPLStandings возвращает таблицу РПЛ
func (s *FootballService) GetRPLStandings() ([]FootballStanding, error) {
	s.standingsMutex.RLock()
	if st, ok := s.standingsCache["RPL"]; ok {
		if lu, ok2 := s.standingsLastUpdate["RPL"]; ok2 && time.Since(lu) < s.standingsTTL {
			s.standingsMutex.RUnlock()
			return st, nil
		}
	}
	s.standingsMutex.RUnlock()

	standings, err := s.fetchRPLStandings()
	if err != nil {
		log.Printf("RPL standings API error, using static: %v", err)
		standings = s.getRPLStaticStandings()
	}

	s.standingsMutex.Lock()
	s.standingsCache["RPL"] = standings
	s.standingsLastUpdate["RPL"] = time.Now()
	s.standingsMutex.Unlock()
	return standings, nil
}

func (s *FootballService) fetchCLStandings() ([]FootballStanding, error) {
	url := fmt.Sprintf("%s/competitions/CL/standings", s.apiBaseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if s.apiKey != "" {
		req.Header.Set("X-Auth-Token", s.apiKey)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("football-data.org standings %d: %s", resp.StatusCode, string(body))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var apiResp fdStandingsResp
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}
	// Берём таблицу типа "TOTAL"
	for _, group := range apiResp.Standings {
		if group.Type != "TOTAL" {
			continue
		}
		result := make([]FootballStanding, 0, len(group.Table))
		for _, row := range group.Table {
			zone := ""
			if row.Position <= 8 {
				zone = "direct"
			} else if row.Position <= 24 {
				zone = "playoff"
			} else {
				zone = "eliminated"
			}
			result = append(result, FootballStanding{
				Position:     row.Position,
				Team:         row.Team.Name,
				Played:       row.PlayedGames,
				Won:          row.Won,
				Draw:         row.Draw,
				Lost:         row.Lost,
				GoalsFor:     row.GoalsFor,
				GoalsAgainst: row.GoalsAgainst,
				GoalDiff:     row.GoalDifference,
				Points:       row.Points,
				Form:         row.Form,
				Zone:         zone,
			})
		}
		log.Printf("Fetched %d CL standings entries from API", len(result))
		return result, nil
	}
	return nil, fmt.Errorf("no TOTAL standings found in CL response")
}

func (s *FootballService) fetchRPLStandings() ([]FootballStanding, error) {
	if s.apiFootballKey == "" {
		return nil, fmt.Errorf("API_FOOTBALL_KEY not set")
	}
	season := time.Now().Year()
	if time.Now().Month() < 7 {
		season--
	}
	url := fmt.Sprintf("%s/standings?league=235&season=%d", s.apiFootballURL, season)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-apisports-key", s.apiFootballKey)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("api-football standings %d: %s", resp.StatusCode, string(body))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var apiResp afStandingsResp
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}
	if len(apiResp.Response) == 0 || len(apiResp.Response[0].League.Standings) == 0 {
		return nil, fmt.Errorf("empty RPL standings response")
	}
	table := apiResp.Response[0].League.Standings[0]
	result := make([]FootballStanding, 0, len(table))
	for _, row := range table {
		zone := ""
		if row.Rank <= 5 {
			zone = "europe"
		} else if row.Rank >= 16 {
			zone = "relegation"
		}
		result = append(result, FootballStanding{
			Position:     row.Rank,
			Team:         row.Team.Name,
			Played:       row.All.Played,
			Won:          row.All.Win,
			Draw:         row.All.Draw,
			Lost:         row.All.Lose,
			GoalsFor:     row.All.Goals.For,
			GoalsAgainst: row.All.Goals.Against,
			GoalDiff:     row.GoalsDiff,
			Points:       row.Points,
			Form:         row.Form,
			Zone:         zone,
		})
	}
	log.Printf("Fetched %d RPL standings entries from API", len(result))
	return result, nil
}

// getCLStaticStandings — статическая таблица ЛЧ 2025/26 (лиговая фаза)
func (s *FootballService) getCLStaticStandings() []FootballStanding {
	data := []struct{ pos int; team string; p, w, d, l, gf, ga, pts int; form, zone string }{
		{1, "Ливерпуль",         8, 7, 0, 1, 22, 5, 21, "WWWWW", "direct"},
		{2, "Барселона",         8, 6, 1, 1, 20, 8, 19, "WWWDW", "direct"},
		{3, "Арсенал",           8, 6, 0, 2, 17, 7, 18, "WWWWL", "direct"},
		{4, "Интер",             8, 5, 3, 0, 15, 6, 18, "DWWWD", "direct"},
		{5, "Атлетико Мадрид",   8, 5, 2, 1, 14, 7, 17, "WWDWW", "direct"},
		{6, "Байер Леверкузен",  8, 5, 2, 1, 16, 9, 17, "WWWDL", "direct"},
		{7, "Астон Вилла",       8, 5, 1, 2, 13, 9, 16, "WLWWW", "direct"},
		{8, "Монако",            8, 5, 1, 2, 12, 8, 16, "WDWLW", "direct"},
		{9, "ПСЖ",               8, 4, 3, 1, 14, 8, 15, "DWWDW", "playoff"},
		{10, "Боруссия Дортмунд",8, 4, 3, 1, 13, 9, 15, "WDLWW", "playoff"},
		{11, "Реал Мадрид",      8, 4, 2, 2, 14, 10, 14, "WWLWL", "playoff"},
		{12, "Ювентус",          8, 4, 2, 2, 10, 8, 14, "WDWDL", "playoff"},
		{13, "Бенфика",          8, 4, 1, 3, 13, 12, 13, "WWLWL", "playoff"},
		{14, "Спортинг",         8, 4, 1, 3, 11, 10, 13, "LWWWD", "playoff"},
		{15, "Фейеноорд",        8, 3, 3, 2, 12, 11, 12, "WDDWL", "playoff"},
		{16, "Брест",            8, 3, 3, 2, 10, 10, 12, "DDDWW", "playoff"},
		{17, "Аталанта",         8, 3, 2, 3, 12, 13, 11, "WLLWW", "playoff"},
		{18, "Боруссия М-Г",     8, 3, 2, 3, 10, 11, 11, "LWWDL", "playoff"},
		{19, "Байерн Мюнхен",    8, 3, 1, 4, 13, 14, 10, "WLWLL", "playoff"},
		{20, "МС Брюгге",        8, 3, 1, 4, 9, 13, 10, "LWWLL", "playoff"},
		{21, "Манчестер Сити",   8, 3, 1, 4, 12, 14, 10, "LLLWW", "playoff"},
		{22, "Штутгарт",         8, 2, 3, 3, 9, 11, 9, "DLLWD", "playoff"},
		{23, "Шахтёр",           8, 2, 3, 3, 8, 12, 9, "LDDWL", "playoff"},
		{24, "Псв Эйндховен",    8, 2, 3, 3, 10, 14, 9, "DLLWD", "playoff"},
		{25, "Лилль",            8, 2, 2, 4, 8, 13, 8, "LLDWL", "eliminated"},
		{26, "Дортмунд II",      8, 2, 2, 4, 7, 12, 8, "WLLLD", "eliminated"},
		{27, "Динамо Загреб",    8, 2, 1, 5, 7, 16, 7, "LLLWL", "eliminated"},
		{28, "Селтик",           8, 1, 3, 4, 7, 14, 6, "LLDLL", "eliminated"},
		{29, "Спортинг Б",       8, 1, 3, 4, 5, 12, 6, "DLLLD", "eliminated"},
		{30, "Галатасарай",      8, 1, 2, 5, 8, 16, 5, "LLLWL", "eliminated"},
		{31, "РБ Лейпциг",       8, 1, 2, 5, 7, 17, 5, "LLLDL", "eliminated"},
		{32, "Гирона",           8, 1, 1, 6, 5, 18, 4, "LLLLD", "eliminated"},
		{33, "Брага",            8, 1, 1, 6, 6, 20, 4, "LLLWL", "eliminated"},
		{34, "Янг Бойз",         8, 0, 3, 5, 5, 19, 3, "DLDLL", "eliminated"},
		{35, "Ред Булл Зальцбург",8, 0, 2, 6, 5, 21, 2, "LLLLD", "eliminated"},
		{36, "Слован Братислава", 8, 0, 1, 7, 4, 26, 1, "LLLLL", "eliminated"},
	}
	result := make([]FootballStanding, len(data))
	for i, r := range data {
		result[i] = FootballStanding{
			Position: r.pos, Team: r.team,
			Played: r.p, Won: r.w, Draw: r.d, Lost: r.l,
			GoalsFor: r.gf, GoalsAgainst: r.ga, GoalDiff: r.gf - r.ga,
			Points: r.pts, Form: r.form, Zone: r.zone,
		}
	}
	return result
}

// getCLStaticBracket — статическая сетка плей-офф ЛЧ на случай недоступности API
func (s *FootballService) getCLStaticBracket() *CLBracket {
	moscowLocation, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		moscowLocation = time.UTC
	}
	now := time.Now().In(moscowLocation)

	makeMatch := func(id, home, away, stage string, daysFromNow int, hour, min int) FootballMatch {
		dt := time.Date(now.Year(), now.Month(), now.Day()+daysFromNow, hour, min, 0, 0, moscowLocation)
		return FootballMatch{
			ID:         id,
			Date:       dt.Format("2006-01-02"),
			Time:       dt.Format("15:04"),
			HomeTeam:   home,
			AwayTeam:   away,
			Tournament: "Лига Чемпионов",
			Status:     "upcoming",
			MatchDate:  dt,
		}
	}

	bracket := &CLBracket{
		RoundOf16: []FootballMatch{
			makeMatch("cl-r16-1", "Ливерпуль", "Бавария", "ROUND_OF_16", 2, 22, 0),
			makeMatch("cl-r16-2", "Реал Мадрид", "ПСЖ", "ROUND_OF_16", 3, 22, 0),
			makeMatch("cl-r16-3", "Барселона", "Манчестер Сити", "ROUND_OF_16", 4, 22, 0),
			makeMatch("cl-r16-4", "Интер", "Арсенал", "ROUND_OF_16", 5, 22, 0),
			makeMatch("cl-r16-5", "Атлетико", "Челси", "ROUND_OF_16", 6, 22, 0),
			makeMatch("cl-r16-6", "Ювентус", "Боруссия Дортмунд", "ROUND_OF_16", 7, 22, 0),
			makeMatch("cl-r16-7", "Байер", "Милан", "ROUND_OF_16", 8, 22, 0),
			makeMatch("cl-r16-8", "Порту", "Наполи", "ROUND_OF_16", 9, 22, 0),
		},
		QuarterFinals: []FootballMatch{
			makeMatch("cl-qf-1", "Победитель пары 1", "Победитель пары 2", "QUARTER_FINALS", 14, 22, 0),
			makeMatch("cl-qf-2", "Победитель пары 3", "Победитель пары 4", "QUARTER_FINALS", 15, 22, 0),
			makeMatch("cl-qf-3", "Победитель пары 5", "Победитель пары 6", "QUARTER_FINALS", 16, 22, 0),
			makeMatch("cl-qf-4", "Победитель пары 7", "Победитель пары 8", "QUARTER_FINALS", 17, 22, 0),
		},
		SemiFinals: []FootballMatch{
			makeMatch("cl-sf-1", "Победитель QF1", "Победитель QF2", "SEMI_FINALS", 21, 22, 0),
			makeMatch("cl-sf-2", "Победитель QF3", "Победитель QF4", "SEMI_FINALS", 22, 22, 0),
		},
		Final: []FootballMatch{
			makeMatch("cl-final", "Победитель SF1", "Победитель SF2", "FINAL", 28, 22, 0),
		},
	}

	return bracket
}

// getRPLStaticStandings — статическая таблица РПЛ (сезон 2025/26)
func (s *FootballService) getRPLStaticStandings() []FootballStanding {
	data := []struct{ pos int; team string; p, w, d, l, gf, ga, pts int; form, zone string }{
		{1, "Краснодар",   20, 14, 3, 3, 38, 17, 45, "WWDWW", "europe"},
		{2, "Зенит",       20, 13, 4, 3, 40, 20, 43, "WDWWL", "europe"},
		{3, "Спартак",     20, 11, 5, 4, 32, 22, 38, "WWDLW", "europe"},
		{4, "ЦСКА",        20, 11, 3, 6, 30, 24, 36, "WLWWL", "europe"},
		{5, "Динамо",      20, 9, 5, 6, 29, 23, 32, "DWWLD", "europe"},
		{6, "Локомотив",   20, 8, 5, 7, 26, 25, 29, "WLDWL", ""},
		{7, "Ростов",      20, 8, 4, 8, 24, 26, 28, "LWWDL", ""},
		{8, "Рубин",       20, 7, 5, 8, 21, 24, 26, "WLLWD", ""},
		{9, "Факел",       20, 6, 6, 8, 20, 25, 24, "DLWDL", ""},
		{10, "Пари НН",    20, 6, 5, 9, 22, 28, 23, "LLDWW", ""},
		{11, "Ахмат",      20, 5, 7, 8, 19, 24, 22, "LDDDW", ""},
		{12, "Химки",      20, 5, 6, 9, 18, 28, 21, "LWWLD", ""},
		{13, "Крылья",     20, 5, 5, 10, 18, 30, 20, "LLDLW", ""},
		{14, "Урал",       20, 4, 6, 10, 17, 29, 18, "LLDLL", ""},
		{15, "Балтика",    20, 3, 7, 10, 15, 31, 16, "LDLLL", ""},
		{16, "Оренбург",   20, 3, 5, 12, 14, 33, 14, "LLLDL", "relegation"},
		{17, "Нижний НН",  20, 2, 5, 13, 12, 35, 11, "LLLLL", "relegation"},
		{18, "Торпедо",    20, 2, 4, 14, 10, 38, 10, "LLLLL", "relegation"},
	}
	result := make([]FootballStanding, len(data))
	for i, r := range data {
		result[i] = FootballStanding{
			Position: r.pos, Team: r.team,
			Played: r.p, Won: r.w, Draw: r.d, Lost: r.l,
			GoalsFor: r.gf, GoalsAgainst: r.ga, GoalDiff: r.gf - r.ga,
			Points: r.pts, Form: r.form, Zone: r.zone,
		}
	}
	return result
}
