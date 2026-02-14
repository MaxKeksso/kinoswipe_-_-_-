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

	// Инициализация сервисов
	matchService := service.NewMatchService(matchRepo, swipeRepo, roomRepo, movieRepo, userRepo)

	// Инициализация handlers
	userHandler := handlers.NewUserHandler(userRepo)
	authHandler := handlers.NewAuthHandler(userRepo)
	roomHandler := handlers.NewRoomHandler(roomRepo, filterRepo)
	filterHandler := handlers.NewFilterHandler(filterRepo, roomRepo)
	movieHandler := handlers.NewMovieHandler(movieRepo, roomRepo, filterRepo)
	swipeHandler := handlers.NewSwipeHandler(swipeRepo, matchService)
	matchHandler := handlers.NewMatchHandler(matchRepo, matchService)
	feedbackHandler := handlers.NewFeedbackHandler(feedbackRepo)
	premiereHandler := handlers.NewPremiereHandler(premiereRepo)
	matchLinkHandler := handlers.NewMatchLinkHandler(matchLinkRepo)

	// Инициализация WebSocket Hub
	wsHub := handlers.NewHub()
	go wsHub.Run()

	// Настройка роутера
	router := mux.NewRouter()

	// Middleware
	router.Use(middleware.Recovery)
	router.Use(middleware.Logging)
	router.Use(middleware.CORS)

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// Health check
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Auth routes
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")

	// User routes
	api.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	api.HandleFunc("/users/{id}", userHandler.GetUser).Methods("GET")
	api.HandleFunc("/users/{id}", userHandler.UpdateUser).Methods("PUT")

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
	api.HandleFunc("/matches/{match_id}/links", matchLinkHandler.GetMatchLinks).Methods("GET")
	api.HandleFunc("/matches/{match_id}/links", matchLinkHandler.CreateMatchLink).Methods("POST")

	// Premiere routes
	api.HandleFunc("/premieres", premiereHandler.GetPremieres).Methods("GET")
	api.HandleFunc("/premieres", premiereHandler.CreatePremiere).Methods("POST")
	api.HandleFunc("/premieres/{id}", premiereHandler.UpdatePremiere).Methods("PUT")
	api.HandleFunc("/premieres/{id}", premiereHandler.DeletePremiere).Methods("DELETE")

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
