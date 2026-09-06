# blblblog - Personal Blog System

A full-stack personal blog system built with FastAPI + React + PostgreSQL + Redis, fully containerized with Docker.

## Features

- **Single-author blog**: only admins can publish articles. Regular users can comment on articles and post in the guestbook; their profile pages remain.
- **Article categories (分区)**: three built-in sections — 技术探索 (tech), 学习追踪 (study), 生活琐事 (life) — stored as stable slugs so display names can be renamed later without a migration.
- **User System**: Register, login (JWT), profile management with avatar upload
- **Blog Articles**: Markdown editor with live preview, image upload, tags, pagination
- **Comments**: Nested replies (threaded comments), Markdown support
- **Guestbook (留言板)**: logged-in users leave messages
- **Likes**: Like/unlike articles and comments, real-time count via Redis
- **Favorites**: Bookmark articles, view favorites in personal center
- **Admin Panel**: Manage users, articles, comments; dashboard statistics; role-based access control
- **User Tracking**: Login time, login count, likes received per user
- **Hybrid Search**: Full-text search (PostgreSQL tsvector) + Semantic search (pgvector), Chinese word segmentation via jieba
- **Online Stats**: Real-time UV/PV tracking using Redis HyperLogLog
- **Responsive Design**: Mobile-first, works on phones and desktops
- **API Documentation**: Auto-generated Swagger UI at `/docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0 async, Alembic |
| Frontend | React 18, Vite, TailwindCSS, React Router 6 |
| Database | PostgreSQL 16 + pgvector extension |
| Cache | Redis 7 |
| Auth | JWT + bcrypt |
| Search | tsvector (full-text) + pgvector (semantic) + jieba (Chinese segmentation) |
| Proxy | Nginx (reverse proxy + static file serving) |
| CI/CD | GitHub Actions (build → ship tarball → SSH deploy) |

## Project Structure

```
blblblog/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, users, articles, comments, likes, favorites, search, admin)
│   │   ├── core/         # Config, security, deps, database
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic
│   │   └── utils/        # Logging, helpers
│   ├── migrations/       # Alembic migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components (including AdminPage)
│   │   ├── hooks/        # Custom React hooks (auth)
│   │   └── services/     # API client (axios)
│   ├── Dockerfile
│   └── nginx.conf
├── nginx/
│   └── nginx.conf        # Production reverse proxy
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/workflows/deploy.yml
└── README.md
```

## Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose v2
- (Optional) OpenAI-compatible API key for semantic search embeddings

### One-command start

```bash
# Clone the repo
git clone https://github.com/bbbeeelllaaa/blblblog.git
cd blblblog

# Start all services
docker compose up -d
```

Services will be available at:

| Service | URL |
|---------|-----|
| Blog Frontend | http://localhost |
| API Docs (Swagger) | http://localhost:8080/docs |
| Backend API | http://localhost:8000 |

The `docker-compose.yml` starts the following containers:

- **postgres**: PostgreSQL 16 with pgvector extension
- **redis**: Redis 7
- **backend**: FastAPI server on port 8000 (with auto-migration)
- **frontend**: React SPA served by Nginx on port 80
- **nginx**: Reverse proxy routing `/api/*` to backend and rest to frontend

## Local Development

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file and edit
cp .env.example .env

# Start PostgreSQL and Redis (via Docker)
docker compose up -d postgres redis

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (with API proxy to backend)
npm run dev
```

Frontend dev server runs on http://localhost:3000 and proxies API requests to http://localhost:8000.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://blog_user:blog_password@localhost:5432/blog_db` |
| `JWT_SECRET_KEY` | Secret key for JWT signing | (required, change me) |
| `JWT_EXPIRE_MINUTES` | Token expiry time | `60` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `AI_API_KEY` | OpenAI-compatible API key for semantic search embeddings (optional) | (empty = full-text search only) |
| `AI_API_BASE` | OpenAI-compatible API base URL | `https://api.openai.com/v1` |
| `AI_MODEL` | Embedding model for semantic search | `gpt-4o-mini` |
| `NGINX_PORT` | Nginx public port (docker) | `8080` |

## API Documentation

Once the backend is running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, get JWT |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/articles` | No | List articles (paginated, optional `?category=tech\|study\|life`) |
| POST | `/articles` | Admin | Create article (requires `category`) |
| GET | `/articles/{id}` | No | Get article detail |
| PUT | `/articles/{id}` | Admin | Update article |
| DELETE | `/articles/{id}` | Admin | Delete article |
| GET | `/articles/{id}/comments` | No | List comments |
| POST | `/articles/{id}/comments` | Yes | Post comment |
| POST | `/likes/articles/{id}` | Yes | Toggle article like |
| POST | `/likes/comments/{id}` | Yes | Toggle comment like |
| POST | `/favorites/articles/{id}` | Yes | Toggle favorite |
| GET | `/favorites` | Yes | List favorites |
| GET | `/search?q=keyword` | No | Hybrid search |
| GET | `/stats/online` | No | Online user count |
| POST | `/stats/view/{id}` | No | Record page view |
| GET | `/admin/stats` | Admin | Dashboard statistics |
| GET | `/admin/users` | Admin | List all users |
| PUT | `/admin/users/{id}/admin` | Admin | Toggle user admin role |
| DELETE | `/admin/users/{id}` | Admin | Delete user |
| GET | `/admin/articles` | Admin | List all articles |
| DELETE | `/admin/articles/{id}` | Admin | Delete any article |
| GET | `/admin/comments` | Admin | List all comments |
| DELETE | `/admin/comments/{id}` | Admin | Delete any comment |

## Admin Panel

After deployment, set the first admin user manually:

```sql
UPDATE users SET is_admin = true WHERE username = 'your-username';
```

Admin users can access the admin panel via the "Admin" link in the navigation bar, with tabs for dashboard statistics, user management, article management, and comment moderation.

## CI/CD

Pushing to the `main` branch triggers `.github/workflows/deploy.yml`:

1. Builds the backend and frontend Docker images
2. Saves them as `backend.tar` / `frontend.tar`
3. Copies the tarballs to the server via SCP
4. SSHes in and runs `deploy-backend.sh` + `deploy-frontend.sh` (which `docker load` and restart the containers), then applies Alembic migrations

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | Server IP or hostname (e.g. `121.199.173.53`) |
| `SSH_USER` | SSH username (e.g. `root`) |
| `SSH_KEY` | Private SSH key for the deploy user (public key must be in the server's `~/.ssh/authorized_keys`) |

The server also needs `/root/blblblog/.env` (copy of `.env.example` with real values). It is **not** committed or sent by CI — it must already exist on the server.

## Advanced Features

### Hybrid Search

Combines PostgreSQL full-text search (`tsvector` with GIN index) and vector similarity search (`pgvector`) for better results. Chinese text is segmented using jieba before indexing. Falls back gracefully if `pgvector` or embeddings are unavailable.

### Online User Counting

Uses Redis with HyperLogLog (UV) and time-windowed keys (PV) for memory-efficient real-time statistics. Online users are tracked via expiring keys with 5-minute TTL.

## License

MIT
