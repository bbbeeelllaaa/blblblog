# MyBlog - Personal Blog System

A full-stack personal blog system built with FastAPI + React + PostgreSQL + Redis, fully containerized with Docker.

## Features

- **User System**: Register, login (JWT), profile management with avatar upload
- **Blog Articles**: Markdown editor with live preview, tags/categories, pagination
- **Comments**: Nested replies (threaded comments), Markdown support
- **Likes**: Like/unlike articles and comments, real-time count via Redis
- **Favorites**: Bookmark articles, view favorites in personal center
- **Hybrid Search**: Full-text search (PostgreSQL tsvector) + Semantic search (pgvector), Chinese word segmentation via jieba
- **Online Stats**: Real-time UV/PV tracking using Redis HyperLogLog
- **AI Summary**: Generate article summaries via OpenAI API (with TextRank fallback)
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
| CI/CD | GitHub Actions + Docker Hub |

## Project Structure

```
myblog/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
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
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks (auth)
│   │   └── services/     # API client (axios)
│   ├── Dockerfile
│   └── nginx.conf
├── nginx/
│   └── nginx.conf        # Production reverse proxy
├── docker-compose.yml
├── .github/workflows/deploy.yml
└── README.md
```

## Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose v2
- (Optional) OpenAI API key for AI features

### One-command start

```bash
# Clone the repo
git clone <your-repo-url>
cd myblog

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
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

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
| `AI_API_KEY` | OpenAI API key (optional) | (empty = fallback to TextRank) |
| `AI_API_BASE` | OpenAI-compatible API base URL | `https://api.openai.com/v1` |
| `AI_MODEL` | Model for AI summary | `gpt-4o-mini` |
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
| GET | `/articles` | No | List articles (paginated) |
| POST | `/articles` | Yes | Create article |
| GET | `/articles/{id}` | No | Get article detail |
| GET | `/articles/{id}/summary` | No | AI summary |
| GET | `/articles/{id}/comments` | No | List comments |
| POST | `/articles/{id}/comments` | Yes | Post comment |
| POST | `/likes/articles/{id}` | Yes | Toggle article like |
| POST | `/likes/comments/{id}` | Yes | Toggle comment like |
| POST | `/favorites/articles/{id}` | Yes | Toggle favorite |
| GET | `/favorites` | Yes | List favorites |
| GET | `/search?q=keyword` | No | Hybrid search |
| GET | `/stats/online` | No | Online user count |
| POST | `/stats/view/{id}` | No | Record page view |

## CI/CD

Pushing to the `main` branch triggers `.github/workflows/deploy.yml`:

1. Builds backend and frontend Docker images
2. Pushes images to Docker Hub
3. SSH into server, pulls latest images, and runs `docker compose up -d`

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_HUB_USERNAME` | Docker Hub username |
| `DOCKER_HUB_TOKEN` | Docker Hub access token |
| `SERVER_HOST` | Server IP or hostname |
| `SERVER_USER` | SSH username |
| `SERVER_SSH_KEY` | SSH private key |
| `JWT_SECRET_KEY` | JWT signing secret |
| `AI_API_KEY` | OpenAI API key (optional) |
| `AI_API_BASE` | API base URL |
| `AI_MODEL` | Model name |

## Advanced Features

### Hybrid Search

Combines PostgreSQL full-text search (`tsvector` with GIN index) and vector similarity search (`pgvector`) for better results. Chinese text is segmented using jieba before indexing. Falls back gracefully if `pgvector` or embeddings are unavailable.

### Online User Counting

Uses Redis with HyperLogLog (UV) and time-windowed keys (PV) for memory-efficient real-time statistics. Online users are tracked via expiring keys with 5-minute TTL.

### AI Article Summary

Click the "AI Summary" button on any article page. Uses OpenAI API if configured, otherwise falls back to extractive summarization (TextRank-like algorithm).

## License

MIT
