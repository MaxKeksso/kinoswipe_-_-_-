package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"
)

// BracketV2Team описывает команду в плей-офф матча
type BracketV2Team struct {
	Name     string `json:"name"`
	IsWinner bool   `json:"isWinner"`
}

// BracketV2Game описывает одну конкретную игру (дом/выезд)
type BracketV2Game struct {
	ID        int    `json:"id"`
	Date      string `json:"date"`
	Time      string `json:"time"`
	HomeTeam  string `json:"homeTeam"`
	AwayTeam  string `json:"awayTeam"`
	HomeScore int    `json:"homeScore"`
	AwayScore int    `json:"awayScore"`
}

// BracketV2Matchup — агрегированная пара (две игры, общий счёт)
type BracketV2Matchup struct {
	MatchupID  string          `json:"matchupId"`
	Stage      string          `json:"stage"`
	Position   int             `json:"position"` // индекс в сетке внутри стадии
	Teams      []BracketV2Team `json:"teams"`
	Games      []BracketV2Game `json:"games"`
	TotalScore [2]int          `json:"totalScore"` // [scoreTeamA, scoreTeamB]
}

// BracketV2Stage — стадия плей-офф (1/8, 1/4 и т.д.)
type BracketV2Stage struct {
	Stage    string             `json:"stage"`
	Matchups []BracketV2Matchup `json:"matchups"`
}

// BuildCLBracketV2 строит агрегированную сетку плей-офф ЛЧ из football-data.org.
// При недоступности API падает обратно на статический CLBracket (v1 fallback).
func (s *FootballService) BuildCLBracketV2() ([]BracketV2Stage, error) {
	raw, err := s.fetchCLKnockoutMatches()
	if err != nil {
		// Fallback: конвертируем v1 статическую сетку в v2 формат
		return convertCLBracketToV2(s.getCLStaticBracket()), nil
	}

	// Группируем матчи по ключу: stage + упорядоченная пара команд
	type agg struct {
		stage string
		a     string
		b     string
		games []FootballDataMatch
	}
	byKey := make(map[string]*agg)

	for _, m := range raw {
		stage := normalizeStage(m.Stage)
		if stage == "" {
			continue
		}
		names := []string{m.HomeTeam.Name, m.AwayTeam.Name}
		sort.Strings(names)
		key := fmt.Sprintf("%s|%s|%s", stage, names[0], names[1])
		a, ok := byKey[key]
		if !ok {
			a = &agg{stage: stage, a: names[0], b: names[1], games: make([]FootballDataMatch, 0, 2)}
			byKey[key] = a
		}
		a.games = append(a.games, m)
	}

	stagesMap := make(map[string][]BracketV2Matchup)

	for key, ag := range byKey {
		// Считаем суммарный счёт по двум играм
		totalA, totalB := 0, 0
		games := make([]BracketV2Game, 0, len(ag.games))

		for _, gm := range ag.games {
			// Парсим дату для красивого времени
			dt, _ := time.Parse(time.RFC3339, gm.UtcDate)
			local := dt
			if loc, err := time.LoadLocation("Europe/Moscow"); err == nil {
				local = dt.In(loc)
			}

			homeGoals := 0
			awayGoals := 0
			if gm.Score.FullTime.HomeTeam != nil {
				homeGoals = *gm.Score.FullTime.HomeTeam
			}
			if gm.Score.FullTime.AwayTeam != nil {
				awayGoals = *gm.Score.FullTime.AwayTeam
			}

			// В какую «корзину» (A или B) засчитывать голы
			if gm.HomeTeam.Name == ag.a {
				totalA += homeGoals
				totalB += awayGoals
			} else {
				totalA += awayGoals
				totalB += homeGoals
			}

			games = append(games, BracketV2Game{
				ID:        gm.ID,
				Date:      local.Format("2006-01-02"),
				Time:      local.Format("15:04"),
				HomeTeam:  gm.HomeTeam.Name,
				AwayTeam:  gm.AwayTeam.Name,
				HomeScore: homeGoals,
				AwayScore: awayGoals,
			})
		}

		// Определяем победителя (упрощённо, без учёта правил выездного гола и пенальти)
		winnerA := false
		winnerB := false
		if totalA > totalB {
			winnerA = true
		} else if totalB > totalA {
			winnerB = true
		}

		matchup := BracketV2Matchup{
			MatchupID: key,
			Stage:     ag.stage,
			Teams: []BracketV2Team{
				{Name: ag.a, IsWinner: winnerA},
				{Name: ag.b, IsWinner: winnerB},
			},
			Games:      games,
			TotalScore: [2]int{totalA, totalB},
		}
		stagesMap[ag.stage] = append(stagesMap[ag.stage], matchup)
	}

	// Сортируем стадии и внутри — по дате первого матча
	stageOrder := []string{"ROUND_OF_16", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"}
	result := make([]BracketV2Stage, 0, len(stageOrder))

	for _, st := range stageOrder {
		matchups := stagesMap[st]
		if len(matchups) == 0 {
			continue
		}

		sort.Slice(matchups, func(i, j int) bool {
			// Позиция — по дате первой игры
			var ti, tj time.Time
			if len(matchups[i].Games) > 0 {
				ti, _ = time.Parse("2006-01-02", matchups[i].Games[0].Date)
			}
			if len(matchups[j].Games) > 0 {
				tj, _ = time.Parse("2006-01-02", matchups[j].Games[0].Date)
			}
			return ti.Before(tj)
		})

		for idx := range matchups {
			matchups[idx].Position = idx
		}

		result = append(result, BracketV2Stage{
			Stage:    st,
			Matchups: matchups,
		})
	}

	return result, nil
}

// fetchCLKnockoutMatches возвращает ВСЕ матчи ЛЧ плей-офф из football-data.org (без фильтра по 30 дням).
func (s *FootballService) fetchCLKnockoutMatches() ([]FootballDataMatch, error) {
	competitionID := "CL"
	url := fmt.Sprintf("%s/competitions/%s/matches", s.apiBaseURL, competitionID)

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
		return nil, fmt.Errorf("football-data.org knockout %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp FootballDataResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}

	result := make([]FootballDataMatch, 0)
	for _, m := range apiResp.Matches {
		stage := normalizeStage(m.Stage)
		if stage == "" {
			continue
		}
		result = append(result, m)
	}
	return result, nil
}

// normalizeStage приводит названия стадий к единому виду, интересуют только плей-офф.
func normalizeStage(s string) string {
	switch s {
	case "LAST_16", "ROUND_OF_16":
		return "ROUND_OF_16"
	case "QUARTER_FINALS":
		return "QUARTER_FINALS"
	case "SEMI_FINALS":
		return "SEMI_FINALS"
	case "FINAL":
		return "FINAL"
	default:
		return ""
	}
}

// convertCLBracketToV2 конвертирует CLBracket (v1 формат) в []BracketV2Stage.
// Используется как fallback когда football-data.org API недоступен.
func convertCLBracketToV2(b *CLBracket) []BracketV2Stage {
	type stageEntry struct {
		name    string
		matches []FootballMatch
	}
	entries := []stageEntry{
		{"LAST_16", b.RoundOf16},
		{"QUARTER_FINALS", b.QuarterFinals},
		{"SEMI_FINALS", b.SemiFinals},
		{"FINAL", b.Final},
	}

	result := make([]BracketV2Stage, 0, 4)
	for _, e := range entries {
		if len(e.matches) == 0 {
			continue
		}
		matchups := make([]BracketV2Matchup, 0, len(e.matches))
		for i, m := range e.matches {
			homeGoals, awayGoals := 0, 0
			games := make([]BracketV2Game, 0)
			if m.Status == "finished" {
				if m.HomeScore != nil {
					homeGoals = *m.HomeScore
				}
				if m.AwayScore != nil {
					awayGoals = *m.AwayScore
				}
				games = append(games, BracketV2Game{
					ID:        i,
					Date:      m.Date,
					Time:      m.Time,
					HomeTeam:  m.HomeTeam,
					AwayTeam:  m.AwayTeam,
					HomeScore: homeGoals,
					AwayScore: awayGoals,
				})
			}
			winner0 := m.Status == "finished" && homeGoals > awayGoals
			winner1 := m.Status == "finished" && awayGoals > homeGoals
			matchups = append(matchups, BracketV2Matchup{
				MatchupID: fmt.Sprintf("%s-%d", e.name, i),
				Stage:     e.name,
				Position:  i,
				Teams: []BracketV2Team{
					{Name: m.HomeTeam, IsWinner: winner0},
					{Name: m.AwayTeam, IsWinner: winner1},
				},
				Games:      games,
				TotalScore: [2]int{homeGoals, awayGoals},
			})
		}
		result = append(result, BracketV2Stage{Stage: e.name, Matchups: matchups})
	}
	return result
}

