# Conce Music AI

> Чат-приложение, в котором пользователь описывает музыкальное намерение, а бэкенд собирает из Spotify «концертный сет-лист»: размечает треки тегами через **YandexGPT** и упорядочивает их **симулированным отжигом**.

[![Quality Gates](https://github.com/aspetrovskii/chern/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/aspetrovskii/chern/actions/workflows/quality-gates.yml)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.112%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

Поддерживается два источника треков: фиксированный плейлист пользователя и динамический пул (Spotify search + recommendations). Если ключи провайдеров не заданы, проект автоматически переключается в **mock-режим** — можно запускать и тестировать без сторонних аккаунтов.

---

## Содержание

- [Возможности](#возможности)
- [Технологический стек](#технологический-стек)
- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Запуск через Docker](#запуск-через-docker)
- [Конфигурация](#конфигурация)
- [Использование](#использование)
- [API](#api)
- [Полезные команды](#полезные-команды)
- [Тестирование](#тестирование)
- [Деплой](#деплой)
- [Roadmap](#roadmap)
- [Вклад в проект](#вклад-в-проект)
- [Лицензия](#лицензия)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Что проверить перед публикацией](#что-проверить-перед-публикацией)

---

## Возможности

- **Чат-интерфейс** для запросов на естественном языке (приоритет — русский; UI поддерживает en / tr / zh).
- **Парсинг намерения** через YandexGPT в JSON-схему (`intent`, `genres`, `mood_arc`, `energy`, `language`, `approx_length`, …).
- **Два источника треков**:
  - режим `fixed_pool` — выбранный плейлист Spotify пользователя;
  - режим `spotify_discovery` — динамический пул через `search` + `recommendations`.
- **Ленивое тегирование** треков через LLM: один запрос на трек, результат кэшируется в SQLite (инвалидация по `llm_version`).
- **Симулированный отжиг** упорядочивает треки по многокомпонентной энергетической функции (релевантность, плавность переходов, дуга настроения, разнообразие).
- **Spotify-интеграция**: OAuth, deep link «Открыть в Spotify», создание/обновление плейлиста в аккаунте пользователя.
- **Ручное редактирование порядка** через `PATCH /chats/{id}/concert/order` с синхронизацией плейлиста Spotify.
- **История версий концертов** в рамках чата.
- **Mock-fallback** при `PROVIDER_MODE=auto` без реальных ключей.
- **Многоязычный UI** (`frontend/src/lib/i18n.ts`).
- **CI quality gates**: lint, unit-тесты, smoke-тесты, миграции БД (`.github/workflows/quality-gates.yml`).

---

## Технологический стек

| Слой | Технологии |
|------|-----------|
| **Backend API** | Python ≥ 3.11, FastAPI ≥ 0.112, Uvicorn ≥ 0.30, pydantic-settings ≥ 2.4 |
| **БД и миграции** | SQLite, SQLAlchemy ≥ 2.0, Alembic ≥ 1.13 |
| **LLM** | YandexGPT (Foundation Models API) + детерминированный mock-транспорт |
| **Оптимизатор** | Симулированный отжиг (`src/optimizer/`) |
| **Spotify** | Spotify Web API: OAuth, search, recommendations, audio features, playlists |
| **Auth** | PyJWT ≥ 2.9, XOR + SHA-256 для шифрования refresh-токенов (`src/app/core/security.py`) |
| **Frontend** | React 18.3, TypeScript ~5.6, Vite ^5.4, react-router-dom ^6.28 (HashRouter), CSS Modules |
| **HTTP** | httpx ≥ 0.27 (backend), `fetch` (frontend) |
| **Контейнеризация** | Docker (`python:3.12-slim-bookworm`, `node:20-alpine`, `nginx:1.27-alpine`), Docker Compose |
| **Качество кода** | Ruff ≥ 0.5, pytest ≥ 8, `tsc --noEmit` |

---

## Архитектура

### Дерево репозитория

```
.
├── src/                            # Python-пакеты бэкенда
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, /health, роутер
│   │   ├── api/
│   │   │   ├── routes/v1.py        # Все REST-эндпоинты /api/v1
│   │   │   ├── schemas.py          # Pydantic DTO
│   │   │   └── deps.py             # auth, get_db
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings)
│   │   │   ├── security.py         # JWT + шифрование refresh-токенов
│   │   │   ├── oauth_state.py      # In-memory CSRF state для OAuth
│   │   │   └── provider_logging.py # redact_secrets_in_text
│   │   ├── db/
│   │   │   ├── models.py           # ORM: User, Chat, Message, Concert, …
│   │   │   └── session.py          # SQLite engine, SessionLocal
│   │   └── services/
│   │       ├── pipeline.py         # ConcertPipeline.run()
│   │       └── providers.py        # Фабрика пайплайна
│   ├── llm/                        # LLM-модуль
│   │   ├── service.py              # parse_user_intent, tag_track
│   │   ├── client.py               # LLMClient + RetryPolicy
│   │   ├── cache.py                # SQLiteTrackCache
│   │   ├── yandex_transport.py     # Реальный транспорт YandexGPT
│   │   ├── mock_transport.py       # Детерминированный mock
│   │   └── transport_factory.py    # build_llm_transport
│   ├── optimizer/service.py        # optimize_order (симулированный отжиг)
│   └── spotify/
│       ├── http_client.py          # SpotifyBackedCatalog (httpx)
│       ├── oauth.py                # authorize_url, exchange_code, fetch_me
│       ├── client.py               # SpotifyTrack, SpotifyClientMock
│       ├── factory.py              # build_spotify_catalog (real/mock)
│       └── link_parse.py           # Парсинг Spotify URL/URI
├── frontend/                       # React SPA
│   ├── src/                        # App.tsx, components/, lib/
│   ├── vite.config.ts              # Proxy /api → http://127.0.0.1:8000
│   └── package.json
├── alembic/versions/               # 20260410_01_init_schema, 20260410_02_concert_label
├── docker/
│   ├── Dockerfile.api              # python:3.12-slim, uvicorn, alembic upgrade head
│   ├── Dockerfile.web              # multi-stage: node build → nginx serve
│   └── nginx-web.conf
├── scripts/
│   ├── smoke_api.py                # Smoke API (TestClient, mock)
│   ├── smoke_docker_compose.py     # Smoke compose-стека
│   └── smoke_llm_pipeline.py       # Smoke LLM-пайплайна
├── tests/                          # pytest (unit)
├── docs/                           # SPECIFICATION.md, plans/
├── docker-compose.yml
├── pyproject.toml
├── alembic.ini
└── .env.example
```

### Главные модули

| Модуль | Назначение |
|--------|-----------|
| `src/app/api/routes/v1.py` | Все REST-эндпоинты: Spotify OAuth, чаты, сообщения, концерты, пул треков |
| `src/app/services/pipeline.py` | `ConcertPipeline.run()` — намерение → кандидаты → теги → отжиг |
| `src/llm/service.py` | `LLMService.parse_user_intent()`, `LLMService.tag_track()` |
| `src/llm/cache.py` | `SQLiteTrackCache` — кэш тегов с инвалидацией по `llm_version` |
| `src/optimizer/service.py` | `optimize_order()` — симулированный отжиг |
| `src/spotify/http_client.py` | `SpotifyBackedCatalog` — поиск, рекомендации, audio features, плейлисты |
| `frontend/src/lib/backendApi.ts` | Клиент к `/api/v1` с обработкой 401/5xx |

---

## Быстрый старт

Минимальный путь до работающего приложения **без внешних провайдеров** (mock-режим): backend → миграции → frontend.

### Требования

| Инструмент | Версия |
|-----------|--------|
| Python | ≥ 3.11 (CI использует 3.11; Docker — 3.12) |
| Node.js | ≥ 20 |
| npm | ≥ 10 (поставляется с Node 20) |
| Git | любая актуальная |
| Docker (опционально) | актуальная версия с плагином Compose |

### 1. Установка зависимостей

```bash
# Backend (editable + dev)
pip install -e ".[dev]"

# Frontend
cd frontend
npm install
cd ..
```

### 2. Конфигурация

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Откройте `.env` и **обязательно** замените значения по умолчанию для секретов:

```dotenv
CRYPTO_KEY=<случайная строка ≥ 32 символа>
JWT_SECRET=<случайная строка ≥ 32 символа>
```

Поля `SPOTIFY_*` и `YANDEX_*` можно оставить пустыми — при `PROVIDER_MODE=auto` бэкенд переключится на mock. Полная таблица переменных — в разделе [Конфигурация](#конфигурация).

### 3. Миграции БД

`PYTHONPATH` должен указывать на `src/` (Alembic-миграции импортируют `app.db`).

```bash
# Linux / macOS
PYTHONPATH=src python -m alembic upgrade head
```

```powershell
# Windows (PowerShell)
$env:PYTHONPATH = "src"
python -m alembic upgrade head
```

### 4. Запуск в dev-режиме

Откройте **два терминала**.

**Терминал 1 — Backend (FastAPI / Uvicorn):**

```bash
# Linux / macOS
PYTHONPATH=src uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
# Windows (PowerShell)
$env:PYTHONPATH = "src"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Терминал 2 — Frontend (Vite):**

```bash
cd frontend
npm run dev
```

Vite запускается на `http://127.0.0.1:5174` и проксирует `/api` на `http://127.0.0.1:8000`.

### 5. Smoke-проверка

| Проверка | Команда / URL | Ожидаемый результат |
|---------|---------------|---------------------|
| Backend жив | `curl http://127.0.0.1:8000/health` | `{"status":"ok"}` |
| Режим провайдеров | `curl http://127.0.0.1:8000/api/v1/providers/status` | JSON с `ui_data_source` |
| Frontend | открыть `http://127.0.0.1:5174` | страница загружается без ошибок в консоли |
| Полный пайплайн (mock) | `python scripts/smoke_api.py` | `smoke_api: OK` |

> **Важно (Spotify OAuth).** Чтобы залогиниться через реальный Spotify, зарегистрируйте redirect URI в [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) **посимвольно** так же, как в `.env`:
> `http://127.0.0.1:8000/api/v1/auth/spotify/callback`.

---

## Запуск через Docker

### Требования

- Docker Desktop (или Docker Engine + Compose plugin).
- Заполненный `.env` в корне репозитория (см. [Конфигурация](#конфигурация)).

### Сборка и запуск

```bash
docker compose up --build
```

Compose поднимает два сервиса:

| Сервис | Dockerfile | Порт хоста | Что делает |
|--------|-----------|------------|-----------|
| `api` | `docker/Dockerfile.api` | `8000` | `alembic upgrade head` → `uvicorn app.main:app` |
| `web` | `docker/Dockerfile.web` | `8080` | nginx + собранный Vite SPA |

Данные SQLite хранятся в именованном томе `conce_data` (`/app/data/sqlite.db`, `/app/data/llm_cache.db`).

### Проверка

```bash
curl http://127.0.0.1:8000/health
python scripts/smoke_docker_compose.py

# Smoke API внутри контейнера (изолированная SQLite, PROVIDER_MODE=mock)
docker compose exec api python /app/scripts/smoke_api.py
```

UI открывается на `http://127.0.0.1:8080/`.

### Остановка

```bash
docker compose down       # остановить
docker compose down -v    # остановить и удалить том с данными
```

---

## Конфигурация

Все настройки читаются из `.env` через `pydantic-settings` (`src/app/core/config.py`). Неизвестные ключи игнорируются (`extra="ignore"`).

### Backend (`.env`)

| Переменная | Обязательна | По умолчанию (`.env.example`) | Описание |
|-----------|:-----------:|--------------------------------|---------|
| `APP_BASE_URL` | — | `http://127.0.0.1:8000` | Базовый URL бэкенда |
| `FRONTEND_PUBLIC_URL` | — | `http://127.0.0.1:8080` | URL фронта (цель редиректа после OAuth) |
| `PROVIDER_MODE` | — | `auto` | `auto` / `real` / `mock` |
| `DB_PATH` | — | `data/sqlite.db` | Путь к файлу БД |
| `LLM_CACHE_DB_PATH` | — | `data/llm_cache.db` | Путь к файлу кэша тегов LLM |
| `CRYPTO_KEY` | **да** | (плейсхолдер) | Ключ шифрования refresh-токенов (≥ 32 символа) |
| `JWT_SECRET` | **да** | (плейсхолдер) | Секрет подписи JWT (≥ 32 символа) |
| `JWT_ALGORITHM` | — | `HS256` | Алгоритм JWT |
| `JWT_EXPIRES_MINUTES` | — | `1440` | Срок жизни JWT, минуты |
| `SPOTIFY_CLIENT_ID` | для `real`-режима | — | Client ID из Spotify Dashboard |
| `SPOTIFY_CLIENT_SECRET` | для `real`-режима | — | Client Secret из Spotify Dashboard |
| `SPOTIFY_REDIRECT_URI` | для `real`-режима | `http://127.0.0.1:8000/api/v1/auth/spotify/callback` | Должен совпадать с URI в Dashboard |
| `SPOTIFY_SCOPES` | — | см. `.env.example` | Пробел-разделённые scopes |
| `SPOTIFY_MARKET` | — | `US` | ISO 3166-1 alpha-2 (или пусто) |
| `SPOTIFY_HTTP_TIMEOUT_SECONDS` | — | `20` | Таймаут HTTP к Spotify, сек |
| `SPOTIFY_MAX_RETRIES` | — | `3` | Число ретраев Spotify |
| `SPOTIFY_RETRY_BASE_DELAY_SECONDS` | — | `0.5` | Базовая задержка ретраев Spotify |
| `SPOTIFY_RETRY_MAX_JITTER_SECONDS` | — | `0.5` | Максимальный jitter ретраев Spotify |
| `YANDEX_MODEL_URI` | для реального LLM* | — | Полный URI модели YandexGPT |
| `YANDEX_FOLDER_ID` | если нет `YANDEX_MODEL_URI` | — | ID каталога Yandex Cloud |
| `YANDEX_MODEL_ID` | — | `yandexgpt/rc` | ID модели (используется с `FOLDER_ID`) |
| `YANDEX_COMPLETION_URL` | — | `https://llm.api.cloud.yandex.net/foundationModels/v1/completion` | URL completion API |
| `YANDEX_API_KEY` | для реального LLM** | — | API-ключ Yandex Cloud |
| `YANDEX_IAM_TOKEN` | для реального LLM** | — | IAM-токен (альтернатива `YANDEX_API_KEY`) |
| `LLM_TIMEOUT_SECONDS` | — | `45` | Таймаут запроса к LLM, сек |
| `LLM_RETRY_ATTEMPTS` | — | `3` | Число ретраев LLM |
| `LLM_RETRY_BASE_BACKOFF_SECONDS` | — | `0.35` | Базовый backoff между ретраями LLM |
| `LLM_RETRY_MAX_JITTER_SECONDS` | — | `0.4` | Максимальный jitter ретраев LLM |
| `LLM_MAX_TOKENS` | — | `2000` | Лимит токенов в ответе LLM |
| `LLM_TEMPERATURE` | — | `0.2` | Температура генерации LLM |

> \* Достаточно одного: `YANDEX_MODEL_URI` **или** пары `YANDEX_FOLDER_ID` + `YANDEX_MODEL_ID`.
> \** Для аутентификации в YandexGPT нужен один из двух: `YANDEX_API_KEY` **или** `YANDEX_IAM_TOKEN`.

### Frontend (Vite)

Передаются как `build.args` в `docker-compose.yml` или через `frontend/.env*` для локальной сборки.

| Переменная | По умолчанию | Описание |
|-----------|--------------|---------|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Base URL API в production-сборке |
| `VITE_TURNSTILE_SITE_KEY` | — | Site key Cloudflare Turnstile (опционально) |

> **Важно.** Значения `VITE_*` запекаются в бандл на этапе `npm run build`. После их изменения нужна пересборка `web`-образа.

---

## Использование

### Типовой сценарий

1. Откройте UI: `http://127.0.0.1:5174` (dev) или `http://127.0.0.1:8080` (Docker).
2. Нажмите «Войти через Spotify» — произойдёт OAuth-редирект.
3. После авторизации — список чатов, создайте новый.
4. В настройках чата выберите режим:
   - **`fixed_pool`** — укажите свой плейлист Spotify;
   - **`spotify_discovery`** — динамический подбор по запросу.
5. Введите запрос, например: *«Медленный меланхоличный вечер, русский рок 90-х, около 10 треков»*.
6. Бэкенд запускает пайплайн `parse_intent → collect_candidates → tag_tracks → optimize_order`.
7. Статус сообщения меняется по мере прогресса: `queued → tagging → optimizing → done` (или `error`).
8. В ответе ассистента появляется упорядоченный плейлист. Клик «Открыть в Spotify» — deep link в нативный клиент.
9. Перетаскивание треков (drag-and-drop) сохраняет порядок в БД и синхронизирует плейлист в Spotify.

### Проверка режима провайдеров

```bash
curl http://127.0.0.1:8000/api/v1/providers/status
```

```json
{
  "provider_mode": "auto",
  "llm": "mock",
  "yandex_configured": false,
  "spotify_oauth_configured": true,
  "ui_data_source": "mock_fallback"
}
```

`ui_data_source: "real_providers"` — используются реальные Spotify и Yandex.

---

## API

Все защищённые маршруты требуют заголовок `Authorization: Bearer <JWT>`, выдаваемый после Spotify OAuth.

OpenAPI-документация запущенного бэкенда:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### Эндпоинты `/api/v1`

#### Статус и диагностика

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/health` | Health check (вне `/api/v1`) — `{"status":"ok"}` |
| `GET` | `/api/v1/providers/status` | Режим провайдеров, статус Yandex/Spotify |

#### Аутентификация

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/auth/spotify/login` | URL для редиректа на Spotify |
| `GET` | `/auth/spotify/callback` | OAuth callback (редирект из Spotify) |
| `POST` | `/auth/spotify/callback` | OAuth callback (JSON-обмен на JWT) |
| `POST` | `/auth/logout` | Выход (`204 No Content`) |
| `GET` | `/me` | Текущий пользователь |

#### Чаты

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/chats` | Список чатов пользователя |
| `POST` | `/chats` | Создать чат |
| `GET` | `/chats/{id}` | Метаданные чата |
| `PATCH` | `/chats/{id}` | Обновить `title` / `mode` / `source_spotify_playlist_id` / `target_track_count` (5–30) |
| `DELETE` | `/chats/{id}` | Удалить чат (`204`) |

#### Сообщения и пайплайн

| Метод | Путь | Описание |
|-------|------|---------|
| `POST` | `/chats/{id}/messages` | Запуск пайплайна (`202 Accepted`) |
| `GET` | `/chats/{id}/messages` | Список сообщений чата |
| `GET` | `/chats/{id}/messages/{msg_id}` | Статус: `queued` / `tagging` / `optimizing` / `done` / `error` |

#### Концерт

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/chats/{id}/concert` | Текущий концерт: упорядоченный список + `spotify_playlist_id` |
| `PATCH` | `/chats/{id}/concert/order` | `{"ordered_track_ids": ["id1", "id2", ...]}` — ручной порядок |
| `PATCH` | `/chats/{id}/concert/meta` | Обновление мета-полей концерта |
| `GET` | `/chats/{id}/concerts` | История версий концертов |
| `POST` | `/chats/{id}/generate` | Пересобрать концерт после правок пула (`202`) |

#### Пул треков и Spotify

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/spotify/playlists` | Плейлисты Spotify пользователя |
| `GET` | `/chats/{id}/pool` | Текущий пул треков |
| `POST` | `/chats/{id}/pool` | Добавить в пул: `track_ids` / `album_id` / `playlist_id` / `artist_id` (`204`) |
| `DELETE` | `/chats/{id}/pool/tracks` | Удалить треки из пула (`204`) |
| `POST` | `/tracks/resolve` | Резолвинг Spotify URL/URI в метаданные |

### Формат ошибки

Все ошибки нормализованы в общий формат (`src/app/main.py`, `ErrorDTO`):

```json
{
  "error_code": "http_404",
  "message": "Chat not found"
}
```

`POST /chats/{id}/messages` и `POST /chats/{id}/generate` возвращают `202 Accepted` — фронт опрашивает `GET /chats/{id}/messages/{msg_id}` до статуса `done` или `error`.

---

## Полезные команды

### Frontend (`frontend/`)

```bash
npm run dev          # Vite dev на 5174
npm run build        # tsc -b + vite build (production)
npm run typecheck    # tsc --noEmit
npm run lint         # alias к typecheck
npm run smoke        # alias к build (используется в CI)
npm run preview      # Превью production-сборки на 5174
```

### Backend

```bash
# Миграции (PYTHONPATH=src обязателен)
python -m alembic upgrade head
python -m alembic downgrade -1
python -m alembic revision --autogenerate -m "name"

# Lint / Format
python -m ruff check src tests scripts
python -m ruff check --fix src tests

# API вручную
PYTHONPATH=src uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Smoke-скрипты

```bash
# LLM-пайплайн (без внешних провайдеров)
python scripts/smoke_llm_pipeline.py

# API через TestClient (изолированная SQLite, PROVIDER_MODE=mock)
python scripts/smoke_api.py

# Запущенный Docker Compose стек
python scripts/smoke_docker_compose.py

# То же, но из контейнера
docker compose exec api python /app/scripts/smoke_api.py
```

### Docker

```bash
docker compose up --build           # Сборка и запуск
docker compose up --build -d        # В фоне
docker compose logs -f api          # Логи API
docker compose down                 # Остановить
docker compose down -v              # + удалить том данных
```

---

## Тестирование

### Запуск unit-тестов

```bash
python -m pytest          # все тесты
python -m pytest -v       # подробный вывод
python -m pytest tests/test_llm_service.py -v   # один файл
```

`pythonpath = ["src"]` уже задан в `pyproject.toml` — экспортировать `PYTHONPATH` для pytest не требуется. Тесты используют mock-транспорт, реальные ключи не нужны.

### Покрытие

| Файл | Что тестируется |
|------|----------------|
| `tests/test_llm_service.py` | `parse_user_intent` (успех + фоллбэк при невалидном JSON), `SQLiteTrackCache` (miss/hit), фоллбэк тегирования при ошибке транспорта |
| `tests/test_spotify_link_parse.py` | `parse_spotify_link`, нормализация `playlist_id` / `track_id` |

### CI quality gates

`.github/workflows/quality-gates.yml` запускает на `pull_request` и `push: develop`:

1. `python -m ruff check src tests scripts`
2. `python -m pytest`
3. `python scripts/smoke_llm_pipeline.py`
4. `python -m alembic upgrade head` + `python scripts/smoke_api.py`
5. `npm run lint` (frontend `tsc --noEmit`)
6. `npm run smoke` (frontend `npm run build`)

---

## Деплой

> Базовая инструкция; production-конфигурация (HTTPS, домен, мониторинг) под конкретный VPS — **планируется / требует уточнения**.

1. Поднять VPS с Docker и Compose plugin.
2. Склонировать репозиторий, создать `.env` с production-значениями:
   - `APP_BASE_URL`, `SPOTIFY_REDIRECT_URI` — реальный домен с HTTPS;
   - `FRONTEND_PUBLIC_URL` — URL фронта;
   - все секреты (`CRYPTO_KEY`, `JWT_SECRET`, `SPOTIFY_*`, `YANDEX_*`) — из переменных окружения сервера или secret-store.
3. В [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) зарегистрировать `SPOTIFY_REDIRECT_URI` **посимвольно** (включая протокол и путь).
4. Поднять стек:

   ```bash
   docker compose up --build -d
   ```

5. Поставить reverse proxy (nginx/Caddy) перед `web:8080` с HTTPS-терминацией.
6. В production пересоберите `web` с правильным `VITE_API_BASE_URL` (значение запекается в бандл):

   ```yaml
   web:
     build:
       args:
         VITE_API_BASE_URL: https://api.your-domain.com
   ```

**Безопасность**

- `.env` и каталог `data/` — права только пользователю сервиса, не world-readable.
- Секреты не должны попадать в логи (`provider_logging.redact_secrets_in_text` маскирует `access_token` / `refresh_token` / `Authorization` / `code`).
- Не коммитьте `.env` и `*.db` (см. `.gitignore`).

---

## Roadmap

> Все пункты помечены как **планируется**.

- [ ] Web Playback SDK (для Spotify Premium) поверх текущего deep link.
- [ ] SSE / WebSocket для real-time статуса пайплайна (вместо polling по `GET /messages/{msg_id}`).
- [ ] Контрактные тесты DTO frontend ↔ backend.
- [ ] E2E smoke браузерного сценария: вход → чат → генерация → сохранение порядка.
- [ ] Production-деплой с HTTPS и автоматическими бэкапами тома `conce_data`.

---

## Вклад в проект

1. Создайте ветку от `develop`:

   ```bash
   git checkout -b feature/your-feature develop
   ```

2. Перед PR пройдите все quality gates локально:

   ```bash
   # Backend
   python -m ruff check src tests scripts
   python -m pytest
   python scripts/smoke_llm_pipeline.py

   # Frontend
   cd frontend && npm run lint && npm run smoke
   ```

3. Откройте PR в `develop`. CI (`.github/workflows/quality-gates.yml`) должен быть зелёным.

**Стиль коммитов:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

**Секреты:** не коммитьте `.env`, реальные ключи и `*.db`-файлы — они в `.gitignore`.

---

## Лицензия

Файл лицензии: LICENSE (GPL v3.0). Внешние зависимости имеют собственные условия использования: [Spotify Developer Terms](https://developer.spotify.com/terms), условия Yandex Cloud для выбранной модели YandexGPT.

---

## Troubleshooting

### 1. `uvicorn` не находит модуль `app`

`pip install -e .` ставит проект как пакет `concert-playlist-llm`, но **не** регистрирует `app` / `llm` / `optimizer` / `spotify` как top-level модули. Установите `PYTHONPATH=src`:

```bash
# Linux / macOS
PYTHONPATH=src uvicorn app.main:app --reload
```

```powershell
# Windows (PowerShell)
$env:PYTHONPATH = "src"
uvicorn app.main:app --reload
```

### 2. Бэкенд работает в mock, хотя ключи заданы

Проверьте `GET /api/v1/providers/status`. При `PROVIDER_MODE=auto` для реального режима нужны:

- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` — все непустые;
- `YANDEX_MODEL_URI` **или** пара `YANDEX_FOLDER_ID` + `YANDEX_MODEL_ID`;
- одно из: `YANDEX_API_KEY` **или** `YANDEX_IAM_TOKEN`.

Если хотя бы одно условие нарушено — бэкенд тихо переключается в `mock_fallback`.

### 3. Spotify OAuth: `INVALID_CLIENT: Invalid redirect URI`

`SPOTIFY_REDIRECT_URI` в `.env` должен совпадать с URI в Spotify Dashboard **посимвольно**. Частые ошибки:

- `localhost` vs `127.0.0.1` (это разные URI);
- `http://` vs `https://`;
- лишний `/` в конце;
- порт 8000 vs 8080.

### 4. `alembic upgrade head` падает — нет директории / БД

По умолчанию `DB_PATH=data/sqlite.db`. Создайте директорию вручную:

```bash
mkdir -p data
```

```powershell
New-Item -ItemType Directory -Force data
```

В Docker `data/` маппится на том `conce_data` и создаётся автоматически.

### 5. Windows: команда `set PYTHONPATH=src` не работает в PowerShell

`set` — это синтаксис `cmd.exe`. В PowerShell используйте `$env:PYTHONPATH = "src"`.

### 6. Windows: проблемы с CRLF при сборке Docker

`Dockerfile.api` использует inline-entrypoint (`/bin/sh -c "..."`), чтобы избежать CRLF-проблем. Если вы добавили свои `*.sh`-скрипты в образ, убедитесь, что они сохранены с LF (`git config core.autocrlf input` или `.gitattributes` с `* text=auto eol=lf`).

### 7. Docker: при сборке `web` ошибка `npm ci` или `package-lock.json out of sync`

Пересоберите lock-файл и образ:

```bash
cd frontend && npm install && cd ..
docker compose build --no-cache web
```

### 8. Frontend в браузере открывается, API возвращает 404 / CORS

- В **dev**: оба процесса должны работать одновременно (`uvicorn` на 8000, Vite на 5174). Vite проксирует `/api` на `127.0.0.1:8000` (`frontend/vite.config.ts`).
- В **Docker-сборке**: `VITE_API_BASE_URL` запечён в бандл на этапе `docker compose build`. Если URL изменился — `docker compose build --no-cache web`.
- CORS-список для backend задан в `src/app/main.py` (5173, 5174, 8080 + `FRONTEND_PUBLIC_URL`). Под другой домен/порт добавьте его туда.

### 9. LLM-запросы завершаются таймаутом

Поднимите `LLM_TIMEOUT_SECONDS` (по умолчанию 45). Проверьте сетевую доступность `YANDEX_COMPLETION_URL` с хоста. Для офлайн-разработки используйте `PROVIDER_MODE=mock`.

### 10. Spotify `/search` возвращает 400 «Invalid limit»

Часто причина — некорректный `SPOTIFY_MARKET` (например, число вместо ISO-кода). Используйте корректный код alpha-2 (`US`, `GB`, `RU`) или оставьте пустым.

### 11. macOS: предупреждение про `cryptography` при запуске

Шифрование refresh-токенов реализовано **без библиотеки `cryptography`** (`src/app/core/security.py` использует SHA-256 + XOR). Если ваша среда подтягивает её транзитивно (например, через старый `pip install`) и ругается на ABI — обновите Python и pip.

### 12. SQLite: `database is locked` под нагрузкой

SQLite используется в WAL-режиме (`src/app/db/session.py`), но это всё ещё один файл на запись. Долгие миграции и параллельные write-операции могут конфликтовать. Для production-нагрузки нужно вынести БД на Postgres — **планируется**.

---

## FAQ

**Можно ли запустить без аккаунта Spotify и Yandex Cloud?**
Да. Оставьте `SPOTIFY_*` и `YANDEX_*` пустыми и держите `PROVIDER_MODE=auto` (или явно `mock`) — пайплайн отработает на детерминированных mock-данных.

**Как проверить, что я в реальном режиме?**
`GET /api/v1/providers/status` → `ui_data_source: "real_providers"`. Если `mock_fallback` — посмотрите, какие из полей `yandex_configured` / `spotify_oauth_configured` равны `false`.

**Какая база нужна — Postgres / MySQL?**
Сейчас только SQLite (`SQLAlchemy 2`, файл из `DB_PATH`). Адаптация под Postgres **не реализована**.

**Где живут токены пользователя?**
В таблице `users` (`src/app/db/models.py`). Spotify refresh-токены шифруются (XOR + SHA-256-производный ключ из `CRYPTO_KEY`) — `src/app/core/security.py`. JWT для фронта подписывается `JWT_SECRET` (HS256 по умолчанию).

**Почему фронт использует `HashRouter`, а не `BrowserRouter`?**
Чтобы SPA на nginx (`docker/nginx-web.conf`) и при подсовывании за reverse proxy работала без серверных rewrite-правил. URL вида `https://host/#/chat/123` отправляются на сервер как `/`.

**Можно ли использовать модель LLM, отличную от YandexGPT?**
Транспорты разделены (`src/llm/yandex_transport.py`, `src/llm/mock_transport.py`, фабрика — `transport_factory.py`). Чтобы подключить, например, OpenAI, нужно реализовать новый транспорт с тем же интерфейсом и расширить `transport_factory`. Готового адаптера в коде нет.

**Почему `POST /messages` возвращает 202, а не 200?**
Пайплайн (LLM-парсинг намерения → теги по N трекам → отжиг) — асинхронный по своей природе. Фронт получает `202` и polling-ит `GET /chats/{id}/messages/{msg_id}` до `done`/`error`.

**Где настраивать CORS?**
`src/app/main.py` — список `_cors_origins`. По умолчанию разрешены `127.0.0.1` и `localhost` на портах 5173, 5174, 8080 + `FRONTEND_PUBLIC_URL`.

**Что считается «версией концерта»?**
Каждая успешная генерация в чате создаёт новую запись в таблице `concerts`. Текущая отдаётся `GET /chats/{id}/concert`, история — `GET /chats/{id}/concerts`.

**Как сбросить локальную БД?**
Удалите `data/sqlite.db` и `data/llm_cache.db` и заново выполните `alembic upgrade head`. В Docker — `docker compose down -v`.

---
