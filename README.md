# VibeBoard

Монорепозиторий: React (Vite) + FastAPI.

## Обзор проекта (контекст)

**VibeBoard** — веб-приложение для досок и канбана: доски с колонками по секциям («Сегодня», «На неделе», «Позже»), задачи с перетаскиванием, исполнителями, цветом карточки и **вложениями-изображениями** (Supabase Storage). Маркетинговый лендинг, вход и регистрация (email и Google через Supabase Auth), личный кабинет и настройки — в общем «рабочем пространстве» с навигацией.

**Фронтенд** (`src/`): React 19, TypeScript, Vite, Tailwind CSS, `react-router-dom`, **i18next** (по умолчанию русский, переключатель RU/EN). Данные досок и задач идут из **Supabase** (`@supabase/supabase-js`): таблицы `boards`, `board_columns`, `tasks`, участники, RLS через `user_can_access_board`. Есть **`axios`** и опциональный **`VITE_API_BASE_URL`** для обращения к отдельному REST API. Канбан: **@dnd-kit** (колонки и карточки, в т.ч. между секциями).

**Бэкенд** (`backend/`): отдельный **FastAPI**-сервис с PostgreSQL и Alembic — не заменяет Supabase для текущего UI досок; нужен для своих эндпоинтов и миграций в каталоге `backend/`.

**Инфраструктура БД (Supabase):** готовые SQL в `supabase/` и скрипты `npm run db:apply-*` (нужны `VITE_SUPABASE_URL` и при удалённом применении `SUPABASE_ACCESS_TOKEN` в `.env.local`). См. комментарии в SQL и корневой [`boards.md`](boards.md); сводка по фичам канбана — [`src/components/boards.md`](src/components/boards.md).

## Требования

- **Node.js** (LTS)
- **Python** 3.11+
- **PostgreSQL** — опционально для реальных запросов к БД; без запущенного сервера ошибка появится при первом обращении к БД через SQLAlchemy engine

## Frontend

Из корня репозитория:

```powershell
npm install
npm run dev
```

Приложение Vite обычно доступно по адресу из вывода терминала (например `http://localhost:5173`).

### Docker (production)

Из корня репозитория (контекст сборки — текущая папка):

```bash
docker build -t vibeboard-web .
docker run --rm -p 8080:80 vibeboard-web
```

Статика отдаётся через nginx; маршруты SPA (`react-router-dom`) обрабатываются через `try_files` → `index.html`.

Опционально при сборке можно передать базовый URL API для Vite:

```bash
docker build -t vibeboard-web --build-arg VITE_API_BASE_URL=https://api.example.com .
```

Образ backend собирается отдельно из каталога `backend/` (см. `backend/Dockerfile`).

## Backend

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Отредактируйте `backend/.env`: задайте `DATABASE_URL` и `SECRET_KEY` (см. комментарии в `.env.example`). Строка подключения к PostgreSQL **не** хранится в `alembic.ini`: Alembic читает `DATABASE_URL` через [`app.core.config.settings`](backend/app/core/config.py) при запуске из каталога `backend/`.

```powershell
uvicorn app.main:app --reload
```

Миграции БД (Alembic — только из каталога `backend/` при активированном venv):

```powershell
alembic revision --autogenerate -m "описание изменений"
alembic upgrade head
```

Для уже написанной вручную ревизии достаточно `alembic upgrade head`. После успешного применения в базе создаётся служебная таблица `alembic_version` (версия схемы).

Если PostgreSQL недоступен, команда завершится с ошибкой примерно за `ALEMBIC_CONNECT_TIMEOUT_SECONDS` секунд (по умолчанию 10), а не будет висеть долго.

### Linux / macOS

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# отредактировать .env: DATABASE_URL и SECRET_KEY; Alembic берёт URL из settings, не из alembic.ini
uvicorn app.main:app --reload
```

```bash
alembic revision --autogenerate -m "описание изменений"
alembic upgrade head
```

После `alembic upgrade head` в PostgreSQL появляется таблица `alembic_version`.

### Полезные URL

| Что | URL |
|-----|-----|
| API | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| Health | `GET` http://127.0.0.1:8000/api/v1/health |

Файл `.env` читается из каталога `backend/` независимо от текущей рабочей директории процесса.
