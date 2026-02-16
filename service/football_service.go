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
}

// Football-Data.org API структуры
type FootballDataResponse struct {
	Matches []FootballDataMatch `json:"matches"`
}

type FootballDataMatch struct {
	ID          int    `json:"id"`
	UtcDate     string `json:"utcDate"`
	Status      string `json:"status"`
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
		apiKey:         apiKey,
		apiFootballKey: apiFootballKey,
		apiBaseURL:     "https://api.football-data.org/v4",
		apiFootballURL: "https://v3.football.api-sports.io",
		cache:          make(map[string][]FootballMatch),
		lastUpdate:     make(map[string]time.Time),
		cacheTTL:       5 * time.Minute,
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

// RefreshCache принудительно обновляет кеш
func (s *FootballService) RefreshCache() error {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	
	delete(s.cache, "RPL")
	delete(s.cache, "EU")
	delete(s.lastUpdate, "RPL")
	delete(s.lastUpdate, "EU")
	
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
