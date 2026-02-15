# Настройка базы данных на Railway (пошагово)

Если в **Deploy Logs** видишь: **`DATABASE_URL is missing or invalid`** — в сервисе приложения (kinoswipe) не задана переменная DATABASE_URL или она не подставляется. Решение: добавить **Reference** на базу (см. Шаг 2 ниже). Ничего вставлять вручную не нужно.

Другие ошибки: `dial tcp [::1]:5432: connection refused` — приложение подключается к localhost вместо базы Railway. То же решение: Reference на PostgreSQL.

---

## Шаг 1: Убедиться, что в проекте есть PostgreSQL

1. Открой проект в Railway (например, `successful-perception`).
2. На главной странице проекта должны быть **два сервиса** (две карточки):
   - **kinoswipe** (или kinoswipe_-_-_-) — само приложение;
   - **PostgreSQL** — база данных.

Если PostgreSQL нет: нажми **+ New** → **Database** → **PostgreSQL**. Дождись создания.

---

## Шаг 2: Добавить переменную DATABASE_URL в сервис приложения (Reference)

1. Открой сервис **приложения** (kinoswipe), не PostgreSQL.
2. Перейди на вкладку **Variables**.
3. Удали все переменные с именем `DATABASE_URL` или с значением типа `postgres://...localhost...` (три точки справа → Delete).  
   **Не добавляй** переменную из блока «Suggested Variables» с текстом про ПОЛЬЗОВАТЕЛЬ/ПАРОЛЬ/localhost — это шаблон для локального запуска, на Railway он не работает.
4. Нажми **+ New Variable**.
5. В поле **Variable name** введи: **`DATABASE_URL`** (одним словом).
6. **Не заполняй** поле значения вручную. Найди кнопку или ссылку **«Add Reference»** (или «Reference») и нажми её.
7. В выпадающем списке выбери **сервис с базой** (Postgres, Postgres-eZKB или иконка слона — именно база, не приложение kinoswipe).
8. Дальше выбери **переменную**: **`DATABASE_URL`** (или **`POSTGRES_PRIVATE_URL`**).
9. Нажми **Add** / **Save**.

В списке переменных появится строка вида `DATABASE_URL` со значением-ссылкой (например, `${{PostgreSQL.DATABASE_URL}}` или просто замаскировано). Это нормально — Railway подставит реальный адрес базы при запуске.

---

## Шаг 3: Перезапуск

Сервис перезапустится сам после сохранения переменной. Если нет — вкладка **Deployments** → три точки у последнего деплоя → **Redeploy**.

В **Deploy Logs** не должно быть строки `connection refused [::1]:5432`. Появится нормальный старт приложения.

---

## Почему таблицы и данные не видны

- Пока приложение подключалось к localhost, оно **вообще не доходило до базы Railway**. Поэтому миграции не выполнялись и таблицы (пользователи, фильмы, анонсы и т.д.) в облачной БД не создавались.
- После правильной настройки **DATABASE_URL** (Reference на PostgreSQL) приложение подключится к облачной БД. Дальше нужно **один раз выполнить миграции**, чтобы создать таблицы.

Миграции на Railway можно выполнить так:

**Вариант A (через Railway CLI):**  
Установи [Railway CLI](https://docs.railway.app/develop/cli), в папке проекта выполни `railway link` (выбери проект и сервис **приложения** kinoswipe), затем:
```bash
railway run sh -c 'wget -qO- https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xz && ./migrate -path ./migrations -database "$DATABASE_URL" up'
```
(переменная `DATABASE_URL` будет подставлена из Reference.)

**Вариант B (с своего компьютера):**  
В Railway открой сервис **PostgreSQL** → вкладка **Connect** → скопируй **Public URL** (или Connection string для внешнего подключения). Установи [migrate](https://github.com/golang-migrate/migrate) локально и выполни (подставь скопированный URL):
```bash
migrate -path ./migrations -database "postgresql://..." up
```

После успешного выполнения миграций таблицы появятся в базе, и приложение начнёт сохранять пользователей, фильмы и т.д.

---

## Кратко

| Где брать URL? | **Ниоткуда не копировать.** В сервисе приложения: Variables → + New Variable → **Add Reference** → PostgreSQL → DATABASE_URL. |
| Что вставлять? | **Ничего.** Reference подставляет значение сам. |
| Шаблон из «Suggested» с localhost | **Не добавлять.** Это для локального запуска. На Railway он ломает подключение. |
