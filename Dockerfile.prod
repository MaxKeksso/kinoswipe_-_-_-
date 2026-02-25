# Сборка фронтенда
FROM node:18-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
ENV REACT_APP_API_URL=/api/v1
RUN npm run build

# Сборка бэкенда
FROM golang:1.22-alpine AS backend
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Итоговый образ: бэкенд + статика фронтенда
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=backend /app/main .
COPY --from=frontend /app/build ./web
COPY migrations ./migrations
EXPOSE 8080
CMD ["./main"]
