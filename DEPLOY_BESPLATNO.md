# Бесплатный деплой KinoSwipe на сервер

Чтобы приложение работало по одной ссылке для всех (без VPN и ngrok), можно выложить его на бесплатный хостинг.

---

## Вариант 1: Railway (проще всего)

**Бесплатно:** $5 кредитов в месяц (хватает на небольшое приложение и БД).

### Шаг 1: Репозиторий на GitHub

1. Создай репозиторий на [github.com](https://github.com).
2. Залей туда проект (если ещё не залит):
   ```bash
   cd /Users/maksimzagorodnev/Downloads/kinoswipe
   git init
   git add .
   git commit -m "Initial"
   git remote add origin https://github.com/MaxKeksso/kinoswipe_-_-_-.git
   git push -u origin main
   ```

### Шаг 2: Railway

1. Зайди на [railway.app](https://railway.app), войди через GitHub.
2. **New Project** → **Deploy from GitHub repo** → выбери репозиторий `kinoswipe`.
3. **Add PostgreSQL:** в проекте нажми **+ New** → **Database** → **PostgreSQL**. Railway создаст БД и переменную `DATABASE_URL`.
4. **Деплой сервиса:**
   - **+ New** → **GitHub Repo** → выбери репозиторий `kinoswipe_-_-_-`.
   - Откроется настройка сервиса. Зайди в **Settings**:
     - **Build:** Builder = **Dockerfile**, Dockerfile Path = `Dockerfile.prod` (в настройках сервиса → Build → Dockerfile path).
     - **Root Directory:** не меняй (корень репо).
   - **Variables (обязательно):** без этого будет ошибка `connection refused [::1]:5432`.
     - Нажми **Variables** → **+ New Variable** → **Add Reference**.
     - Выбери сервис **PostgreSQL** (не «Raw value»).
     - В списке переменных выбери **`DATABASE_URL`** (или **`POSTGRES_PRIVATE_URL`** — внутренний URL).
     - Сохрани. У сервиса приложения должна появиться переменная `DATABASE_URL` со значением из БД (внутренний хост, не localhost).
     - Если Reference нет: открой сервис PostgreSQL → вкладка **Variables** или **Connect** → скопируй **Private URL** и в сервисе приложения добавь **Add Variable** → имя `DATABASE_URL`, значение — вставленный URL.
   - **Deploy** запустится сам после сохранения (или нажми **Redeploy** после добавления переменной).

5. После сборки открой **Settings** → **Networking** → **Generate Domain**. Появится ссылка вида `https://kinoswipe-production-xxxx.up.railway.app`.

### Шаг 3: Миграции БД

Миграции нужно выполнить один раз. Варианты:

- **Через Railway CLI:** установи [Railway CLI](https://docs.railway.app/develop/cli), в папке проекта выполни:
  ```bash
  railway link
  railway run sh -c 'wget -qO- https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xz && ./migrate -path ./migrations -database "$DATABASE_URL" up'
  ```
- **Или** установи [migrate](https://github.com/golang-migrate/migrate) локально и выполни миграции, подставив **внешний** URL БД из Railway (PostgreSQL → Connect → External URL):
  ```bash
  migrate -path ./migrations -database "postgres://user:pass@host:port/railway?sslmode=require" up
  ```

### Если в логах: `connection refused [::1]:5432`

Приложение не видит БД, потому что у сервиса приложения не задан `DATABASE_URL` (оно подключается к localhost).

**Что сделать:**

1. В проекте Railway открой **сервис приложения** (kinoswipe, не PostgreSQL).
2. Вкладка **Variables**.
3. Добавь переменную от БД:
   - Кнопка **+ New Variable** → **Add Reference**.
   - Выбери сервис **PostgreSQL**.
   - Выбери переменную **`DATABASE_URL`** (или **`POSTGRES_PRIVATE_URL`** — внутренний URL в сети Railway).
   - Сохрани.
4. Сервис перезапустится сам. В логах должно пропасть `connection refused` и появиться нормальный старт.

Если Reference недоступен: открой сервис **PostgreSQL** → вкладка **Connect** / **Variables** → скопируй **Private URL** (или Internal URL). В сервисе приложения **Variables** → **Add Variable** → имя `DATABASE_URL`, значение — вставленный URL → сохрани.

### Шаг 4: Ссылка для людей

Раздавай пользователям один адрес: **https://твой-сервис.up.railway.app**  
Код комнаты и приглашение работают как раньше, только базовая ссылка — эта (без VPN и ngrok).

---

## Вариант 2: Render

**Бесплатно:** бесплатный веб-сервис и бесплатная PostgreSQL (услуга «засыпает» после неактивности).

1. [render.com](https://render.com) → Sign Up (через GitHub).
2. **New** → **PostgreSQL** — создай БД, скопируй **Internal Database URL** (или External).
3. **New** → **Web Service** → подключи репозиторий `kinoswipe`.
   - **Build Command:** не нужен (собираем через Docker).
   - **Docker:** в Render для Web Service можно указать Dockerfile: в настройках выбери **Docker** и укажи путь к `Dockerfile.prod` (или корень, если Dockerfile называется `Dockerfile.prod`; у части планов есть ограничения по Docker).
   - Лучше проверить актуальную документацию Render: [Docker deploy](https://render.com/docs/docker).
4. **Environment:** добавь переменную `DATABASE_URL` = URL из шага 2.
5. После деплоя Render даст ссылку вида `https://kinoswipe.onrender.com`.

Миграции: через Render Shell или локально с подключением к внешнему URL БД.

---

## Вариант 3: Fly.io

**Бесплатно:** небольшой бесплатный лимит в месяц.

1. Установи [flyctl](https://fly.io/docs/hub/quickstart/) и войди: `fly auth login`.
2. В папке проекта:
   ```bash
   fly launch
   ```
   Создай приложение, выбери регион. Когда спросит про PostgreSQL — можно создать или подключить позже.
3. Добавь БД: `fly postgres create` или привяжи внешнюю.
4. Переменная: `fly secrets set DATABASE_URL=postgres://...`
5. Деплой: в `Dockerfile.prod` образ собирается из корня; для Fly нужно убедиться, что в корне есть `Dockerfile.prod` и в `fly.toml` указан правильный Dockerfile (или переименуй в `Dockerfile` для деплоя).

Подробнее: [fly.io/docs](https://fly.io/docs).

---

## Что важно

- В приложении уже используется **DATABASE_URL** — на хостинге достаточно задать эту переменную от их PostgreSQL.
- **Один образ:** `Dockerfile.prod` собирает бэкенд и фронтенд; бэкенд отдаёт API и статику с одного порта (8080). На Railway/Render/Fly открывают один сервис по этому порту.
- После деплоя **в поле «IP или ссылка для интернета»** вставляй выданную хостингом ссылку (например `https://твой-проект.up.railway.app`) и копируй «Ссылку для другого устройства» — тогда всё будет работать без VPN по одной постоянной ссылке.
