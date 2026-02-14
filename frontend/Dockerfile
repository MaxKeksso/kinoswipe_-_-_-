# Multi-stage build для React приложения
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости с --legacy-peer-deps для разрешения конфликтов
RUN npm ci --legacy-peer-deps

# Копируем исходный код
COPY . .

# ARG для переменных окружения во время сборки
ARG REACT_APP_API_URL=http://localhost:8080/api/v1
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Собираем приложение
RUN npm run build

# Production stage - используем nginx для раздачи статики
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

