.PHONY: help build run test migrate-up migrate-down docker-up docker-down clean

help: ## Показать помощь
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Собрать приложение
	go build -o bin/server ./cmd/server

run: ## Запустить приложение
	go run ./cmd/server

test: ## Запустить тесты
	go test -v ./...

migrate-up: ## Применить миграции (требует golang-migrate)
	migrate -path ./migrations -database "postgres://kinoswipe:kinoswipe123@localhost:5432/kinoswipe?sslmode=disable" up

migrate-down: ## Откатить миграции (требует golang-migrate)
	migrate -path ./migrations -database "postgres://kinoswipe:kinoswipe123@localhost:5432/kinoswipe?sslmode=disable" down

migrate-docker: ## Применить миграции через Docker
	@echo "Применение миграций через Docker..."
	docker run --rm \
		-v "$(PWD)/migrations:/migrations" \
		--network host \
		migrate/migrate:v4.17.0 \
		-path /migrations \
		-database "postgres://kinoswipe:kinoswipe123@localhost:5432/kinoswipe?sslmode=disable" \
		up

docker-up: ## Запустить через Docker Compose
	docker-compose up -d

docker-down: ## Остановить Docker Compose
	docker-compose down

docker-logs: ## Показать логи Docker
	docker-compose logs -f

docker-restart: ## Перезапустить контейнеры
	docker-compose restart

clean: ## Очистить скомпилированные файлы
	rm -rf bin/

mod-tidy: ## Обновить зависимости
	go mod tidy

mod-download: ## Скачать зависимости
	go mod download

install-tools: ## Установить необходимые инструменты (macOS)
	@echo "Установка golang-migrate через brew..."
	brew install golang-migrate
