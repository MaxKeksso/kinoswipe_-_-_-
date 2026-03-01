package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"kinoswipe/config"
	"kinoswipe/database"
	"kinoswipe/handlers"
	"kinoswipe/middleware"
	"kinoswipe/repository"
	"kinoswipe/service"

	"github.com/gorilla/mux"
)

func main() {
	// Загрузка конфигурации
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Подключение к базе данных
	db, err := database.New(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Инициализация репозиториев
	userRepo := repository.NewUserRepository(db.DB)
	roomRepo := repository.NewRoomRepository(db.DB)
	filterRepo := repository.NewFilterRepository(db.DB)
	movieRepo := repository.NewMovieRepository(db.DB)
	swipeRepo := repository.NewSwipeRepository(db.DB)
	matchRepo := repository.NewMatchRepository(db.DB)
	feedbackRepo := repository.NewFeedbackRepository(db.DB)
	premiereRepo := repository.NewPremiereRepository(db.DB)
	matchLinkRepo := repository.NewMatchLinkRepository(db.DB)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.DB)

	// Инициализация сервисов
	matchService := service.NewMatchService(matchRepo, swipeRepo, roomRepo, movieRepo, userRepo)
	footballService := service.NewFootballService(cfg.FootballAPI.Key, cfg.FootballAPI.ApiFootballKey)

	// Инициализация handlers
	userHandler := handlers.NewUserHandler(userRepo)
	authHandler := handlers.NewAuthHandler(userRepo, refreshTokenRepo, cfg)
	roomHandler := handlers.NewRoomHandler(roomRepo, filterRepo)
	filterHandler := handlers.NewFilterHandler(filterRepo, roomRepo)
	movieHandler := handlers.NewMovieHandler(movieRepo, roomRepo, filterRepo)
	// Инициализация WebSocket Hub (до handlers, т.к. SwipeHandler его использует)
	wsHub := handlers.NewHub()
	wsHub.SetAuth(userRepo, cfg)
	go wsHub.Run()

	swipeHandler := handlers.NewSwipeHandler(swipeRepo, matchService, wsHub)
	matchHandler := handlers.NewMatchHandler(matchRepo, matchService)
	feedbackHandler := handlers.NewFeedbackHandler(feedbackRepo)
	premiereHandler := handlers.NewPremiereHandler(premiereRepo)
	matchLinkHandler := handlers.NewMatchLinkHandler(matchLinkRepo)
	footballHandler := handlers.NewFootballHandler(footballService)
	gameScoreRepo := repository.NewGameScoreRepository(db.DB)
	gameHandler := handlers.NewGameHandler(gameScoreRepo)

	// Настройка роутера
	router := mux.NewRouter()

	// Middleware (порядок: request_id → логирование → CORS)
	router.Use(middleware.Recovery)
	router.Use(middleware.RequestID)
	router.Use(middleware.Logging)
	router.Use(middleware.CORS)

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()
	apiV2 := router.PathPrefix("/api/v2").Subrouter()

	// Rate limiting по IP (если включено в конфиге)
	if cfg.Server.RateLimitRPM > 0 {
		rateLimiter := middleware.NewRateLimiter(cfg.Server.RateLimitRPM, 1*time.Minute)
		api.Use(rateLimiter.Middleware)
	}

	// Auth middleware: JWT или X-User-ID → user в контексте
	api.Use(middleware.AuthMiddleware(userRepo, cfg))

	// Health check (проверка БД)
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if err := db.Ping(); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"unhealthy","error":"database"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	// Auth routes (публичные)
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	api.HandleFunc("/auth/refresh", authHandler.Refresh).Methods("POST")

	// User routes
	api.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	api.HandleFunc("/users/{id}", userHandler.GetUser).Methods("GET")
	api.HandleFunc("/users/{id}", userHandler.UpdateUser).Methods("PUT")
	api.HandleFunc("/users/{id}/statistics", userHandler.GetUserStatistics).Methods("GET")

	// Room routes
	api.HandleFunc("/rooms", roomHandler.CreateRoom).Methods("POST")
	api.HandleFunc("/rooms", roomHandler.GetAllRooms).Methods("GET")
	api.HandleFunc("/rooms/code/{code}", roomHandler.GetRoomByCode).Methods("GET")
	api.HandleFunc("/rooms/code/{code}/join", roomHandler.JoinRoom).Methods("POST")
	api.HandleFunc("/rooms/{room_id}/start", roomHandler.StartRoom).Methods("POST")
	api.HandleFunc("/rooms/{room_id}/members", roomHandler.GetRoomMembers).Methods("GET")

	// Закомментированы нереализованные методы
	// api.HandleFunc("/rooms/{id}", roomHandler.GetRoom).Methods("GET")
	// api.HandleFunc("/rooms/{id}/members", roomHandler.GetRoomMembers).Methods("GET")
	// api.HandleFunc("/rooms/{id}/status", roomHandler.UpdateRoomStatus).Methods("PUT")

	// Filter routes
	api.HandleFunc("/rooms/{room_id}/filters", filterHandler.CreateFilter).Methods("POST")
	api.HandleFunc("/filters/{id}", filterHandler.GetFilter).Methods("GET")
	api.HandleFunc("/rooms/{room_id}/filters", filterHandler.GetRoomFilter).Methods("GET")

	// Movie routes
	api.HandleFunc("/movies", movieHandler.GetAllMovies).Methods("GET")
	api.HandleFunc("/movies", movieHandler.CreateMovie).Methods("POST")
	api.HandleFunc("/movies/{id}", movieHandler.GetMovie).Methods("GET")
	api.HandleFunc("/movies/{id}", movieHandler.UpdateMovie).Methods("PUT")
	api.HandleFunc("/rooms/{room_id}/movies", movieHandler.GetRoomMovies).Methods("GET")

	// Swipe routes
	api.HandleFunc("/rooms/{room_id}/swipes", swipeHandler.CreateSwipe).Methods("POST")
	api.HandleFunc("/rooms/{room_id}/swipes/undo", swipeHandler.UndoSwipe).Methods("POST")
	api.HandleFunc("/rooms/{room_id}/swipes", swipeHandler.GetUserSwipes).Methods("GET")

	// Match routes
	api.HandleFunc("/matches/{id}", matchHandler.GetMatch).Methods("GET")
	api.HandleFunc("/rooms/{room_id}/matches", matchHandler.GetRoomMatches).Methods("GET")
	api.HandleFunc("/rooms/{room_id}/almost-matches", matchHandler.GetRoomAlmostMatches).Methods("GET")
	api.HandleFunc("/matches/{match_id}/links", matchLinkHandler.GetMatchLinks).Methods("GET")
	api.HandleFunc("/matches/{match_id}/links", matchLinkHandler.CreateMatchLink).Methods("POST")

	// Premiere routes (GET публичный; create/update/delete только для админа)
	api.HandleFunc("/premieres", premiereHandler.GetPremieres).Methods("GET")
	api.Handle("/premieres", middleware.RequireAdmin(http.HandlerFunc(premiereHandler.CreatePremiere))).Methods("POST")
	api.Handle("/premieres/{id}", middleware.RequireAdmin(http.HandlerFunc(premiereHandler.UpdatePremiere))).Methods("PUT")
	api.Handle("/premieres/{id}", middleware.RequireAdmin(http.HandlerFunc(premiereHandler.DeletePremiere))).Methods("DELETE")

	// Football routes
	api.HandleFunc("/football/matches", footballHandler.GetMatches).Methods("GET")
	api.HandleFunc("/football/standings", footballHandler.GetStandings).Methods("GET")
	api.HandleFunc("/football/cl/bracket", footballHandler.GetCLBracket).Methods("GET")
	api.HandleFunc("/football/refresh", footballHandler.RefreshMatches).Methods("POST")

	// Experimental v2 routes (песочница для турнирной сетки)
	apiV2.HandleFunc("/bracket-test", footballHandler.GetCLBracketV2).Methods("GET")

	// Game routes
	api.HandleFunc("/game/scores", gameHandler.SubmitScore).Methods("POST")
	api.HandleFunc("/game/leaderboard", gameHandler.GetLeaderboard).Methods("GET")

	// Feedback routes
	api.HandleFunc("/feedbacks", feedbackHandler.CreateFeedback).Methods("POST")
	api.HandleFunc("/feedbacks/{id}", feedbackHandler.GetFeedback).Methods("GET")
	api.HandleFunc("/rooms/{room_id}/feedbacks", feedbackHandler.GetRoomFeedbacks).Methods("GET")

	// WebSocket route
	api.HandleFunc("/rooms/{room_id}/ws", wsHub.HandleWebSocket).Methods("GET")

	// Раздача фронтенда (для деплоя в один сервис; локально папки web нет — тогда 404)
	if _, err := os.Stat("web/index.html"); err == nil {
		fs := http.FileServer(http.Dir("web"))
		router.PathPrefix("/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/" && r.URL.Path != "" {
				f := "web" + r.URL.Path
				if _, err := os.Stat(f); err == nil {
					fs.ServeHTTP(w, r)
					return
				}
			}
			http.ServeFile(w, r, "web/index.html")
		}))
	}

	// Настройка сервера
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Server starting on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Ожидание сигнала для graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
