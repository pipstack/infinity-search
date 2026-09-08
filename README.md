# Infinity Search

Infinity Search is a lightweight, self-hosted site search and bookmark manager built with Go, SQLite, and a simple web frontend.

It is designed to be easy to deploy with Docker while keeping application data persistent in a Docker named volume.

## Overview

Infinity Search provides a small web interface for storing websites and searching them locally.

The application consists of:

- A Go backend
- SQLite for persistent storage
- SQLite FTS5 for full-text search
- A static HTML/CSS/JavaScript frontend
- Docker for production deployment
- Docker Compose for easy operation

The backend serves both the API and the frontend.

## Features

- Add websites with a name, URL, and description
- List stored websites
- Search stored websites
- Delete websites
- Server-side persistent storage
- SQLite database
- SQLite FTS5 full-text search
- Creation date/time stored in the database
- Date/time displayed in the frontend
- Static frontend served directly by the Go server
- Docker multi-stage production build
- Small production runtime image
- Non-root container execution
- Persistent Docker named volume
- No external database server required
- Versioned Docker image available from Docker Hub

## Architecture

```text
                    ┌─────────────────────┐
                    │       Browser       │
                    │                     │
                    │ HTML / CSS / JS     │
                    └──────────┬──────────┘
                               │
                               │ HTTP
                               ▼
                    ┌─────────────────────┐
                    │  Infinity Search    │
                    │     Go Server       │
                    │                     │
                    │ Frontend + REST API │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       SQLite        │
                    │                     │
                    │ local-search.db     │
                    │ SQLite FTS5         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Docker Volume     │
                    │                     │
                    │ /data               │
                    └─────────────────────┘
```

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Go |
| Database | SQLite |
| SQLite driver | `modernc.org/sqlite` |
| Search | SQLite FTS5 |
| Frontend | HTML / CSS / JavaScript |
| Containerization | Docker |
| Orchestration | Docker Compose |
| Runtime base | Alpine Linux |

## API

### Health Check

```http
GET /api/health
```

Example:

```bash
curl http://localhost:18080/api/health
```

Response:

```json
{
  "status": "ok"
}
```

### List Sites

```http
GET /api/sites
```

Example:

```bash
curl http://localhost:18080/api/sites
```

### Search Sites

```http
GET /api/sites?q=<query>
```

Example:

```bash
curl 'http://localhost:18080/api/sites?q=github'
```

The search endpoint uses the application's SQLite FTS5 search functionality.

### Add a Site

```http
POST /api/sites
Content-Type: application/json
```

Example:

```bash
curl -X POST http://localhost:18080/api/sites \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Example",
    "url": "https://example.com",
    "description": "Example website"
  }'
```

### Delete a Site

```http
DELETE /api/sites/:id
```

Example:

```bash
curl -X DELETE http://localhost:18080/api/sites/1
```

## Database

Infinity Search uses SQLite.

The database path inside the container is:

```text
/data/local-search.db
```

The database is stored on a Docker named volume rather than inside the container's writable layer.

Current Compose volume:

```text
local-search_infinity-search-data
```

Mount:

```text
/data
```

This means the database survives normal container recreation and image upgrades.

### Important

Do not run:

```bash
docker compose down -v
```

unless you intentionally want to remove the persistent Docker volume and its data.

Normal:

```bash
docker compose down
```

does not remove the named volume.

Likewise:

```bash
docker compose up -d --force-recreate
```

recreates the container while keeping the existing volume.

## Docker Hub

Production image:

```text
duefix/infinity-search:1.0.0
```

Latest tag:

```text
duefix/infinity-search:latest
```

Published image digest:

```text
sha256:f1c344e088006a475c3af3aec594dc2e23d04bc1455254d5f54a7df7785b450c
```

The `1.0.0` and `latest` tags currently point to the same published image digest.

## Docker Compose

The production Compose configuration uses the versioned image:

```yaml
services:
  infinity-search:
    image: duefix/infinity-search:1.0.0
    container_name: infinity-search
    restart: unless-stopped

    ports:
      - "18080:8080"

    volumes:
      - infinity-search-data:/data

volumes:
  infinity-search-data:
```

## Production Deployment

### Requirements

You need:

- Docker
- Docker Compose
- Network access to Docker Hub

### Clone the Repository

```bash
git clone git@github.com:pipstack/infinity-search.git
cd infinity-search
```

### Pull the Production Image

```bash
docker pull duefix/infinity-search:1.0.0
```

### Start the Application

```bash
docker compose up -d
```

The application will be available at:

```text
http://localhost:18080
```

### Check Container Status

```bash
docker compose ps
```

### Check Health

```bash
curl http://localhost:18080/api/health
```

Expected:

```json
{
  "status": "ok"
}
```

### View Logs

```bash
docker compose logs -f
```

### Restart

```bash
docker compose restart
```

### Recreate After an Image Update

```bash
docker compose pull
docker compose up -d --force-recreate
```

The persistent database volume remains attached to `/data`.

## Updating Versions

The recommended production configuration uses a versioned image tag instead of relying exclusively on `latest`.

For example:

```yaml
image: duefix/infinity-search:1.0.0
```

When a future release is published, update the Compose image tag:

```yaml
image: duefix/infinity-search:<new-version>
```

Then run:

```bash
docker compose pull
docker compose up -d --force-recreate
```

The SQLite database remains in the named Docker volume.

## Persistence and Data Safety

The application database is:

```text
/data/local-search.db
```

The Docker volume is:

```text
local-search_infinity-search-data
```

The volume is independent from the container lifecycle.

For example:

```bash
docker compose up -d --force-recreate
```

will recreate the application container without deleting the database.

Avoid:

```bash
docker compose down -v
```

because the `-v` option removes Compose-managed volumes.

### Inspect the Volume

```bash
docker volume inspect local-search_infinity-search-data
```

### Verify the Container Mount

```bash
docker inspect infinity-search \
  --format='{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
```

Expected:

```text
local-search_infinity-search-data -> /data
```

## Local Development

### Build the Go Application

```bash
go build -o local-search-server ./backend
```

### Run the Server

```bash
./local-search-server
```

The application uses:

```text
/data/local-search.db
```

as its SQLite database path.

For normal development, make sure the `/data` directory exists and is writable by the process.

### Go Dependencies

The project uses Go modules.

Download dependencies with:

```bash
go mod download
```

Verify dependencies with:

```bash
go mod tidy
```

Do not run `go mod tidy` unnecessarily if you only want to build the existing project state, because it may modify `go.mod` or `go.sum`.

## Dockerfile

The production Dockerfile uses a multi-stage build.

### Build Stage

```text
golang:1.27-alpine
```

The application is compiled with:

```text
CGO_ENABLED=0
-trimpath
-ldflags="-s -w"
```

### Runtime Stage

```text
alpine:3.22
```

The final image contains the compiled server and required static application files rather than the Go build environment.

### Security

The production container runs as a non-root user named:

```text
app
```

The container exposes:

```text
8080
```

Docker Compose maps it to:

```text
18080
```

on the host.

## Building the Image Locally

To build the image from the Dockerfile:

```bash
docker build -t duefix/infinity-search:local .
```

Check the resulting image:

```bash
docker image inspect duefix/infinity-search:local
```

Run a local build with Compose by changing the Compose image reference if required.

For production deployments, use the published versioned Docker Hub image.

## Project Structure

```text
infinity-search/
├── backend/
│   └── main.go
├── index.html
├── script.js
├── style.css
├── Dockerfile
├── compose.yaml
├── .dockerignore
├── .gitignore
├── go.mod
└── go.sum
```

Additional local backup/development files may exist in a working copy but are not required for the production container.

## Frontend

The frontend is served directly by the Go backend.

The current architecture does not depend on browser `localStorage` for the primary site database.

Site records are stored server-side through the REST API and SQLite.

This allows data to remain available across:

- Browser refreshes
- Browser changes
- Container restarts
- Container recreation
- Docker image upgrades

as long as the persistent Docker volume is retained.

## Search

Search is implemented using SQLite FTS5.

This provides database-level full-text search without requiring a separate search service.

The API exposes search through:

```text
GET /api/sites?q=<query>
```

This keeps the application lightweight and self-contained.

## Configuration

The current deployment does not require an external database service or separate database credentials.

The important runtime path is:

```text
/data/local-search.db
```

The application listens on container port:

```text
8080
```

Docker Compose exposes:

```text
18080
```

on the host.

## Verification

The production Docker deployment has been verified with the following checks:

### Docker Hub Pull

```bash
docker pull duefix/infinity-search:1.0.0
```

Verified digest:

```text
sha256:f1c344e088006a475c3af3aec594dc2e23d04bc1455254d5f54a7df7785b450c
```

### Container Image

The running container was verified to use:

```text
duefix/infinity-search:1.0.0
```

with the same image digest.

### Health

```text
/api/health
```

returned:

```json
{
  "status": "ok"
}
```

### Persistence

An existing database record survived container recreation:

```text
Docker Persistence Test
```

This confirms that the SQLite database is stored on the persistent Docker volume rather than being tied to the container filesystem.

### Frontend

The frontend was also tested successfully through the Docker deployment.

## Git Workflow

The project repository is hosted on GitHub:

```text
git@github.com:pipstack/infinity-search.git
```

Main branch:

```text
main
```

Typical workflow:

```bash
git status
git add .
git commit -m "Describe the change"
git push origin main
```

Before committing, review changes with:

```bash
git --no-pager diff
```

## Docker Image Publishing

To publish a new image version:

```bash
docker build -t duefix/infinity-search:<version> .
docker push duefix/infinity-search:<version>
```

If updating the `latest` tag:

```bash
docker tag duefix/infinity-search:<version> duefix/infinity-search:latest
docker push duefix/infinity-search:latest
```

It is recommended to keep immutable/versioned tags such as:

```text
1.0.0
1.1.0
2.0.0
```

for reproducible deployments.

## Operational Notes

- Keep the persistent Docker volume.
- Prefer versioned Docker image tags for production.
- Do not use `docker compose down -v` unless deleting application data is intentional.
- Back up the SQLite database before major migrations.
- Check application logs when troubleshooting.
- Verify `/api/health` after deployments.
- Verify existing records after database or container changes.

## Troubleshooting

### Container Is Not Running

Check:

```bash
docker compose ps
```

Then:

```bash
docker compose logs --tail=100
```

### Health Check Fails

Check the container:

```bash
docker inspect infinity-search
```

Then inspect logs:

```bash
docker compose logs --tail=100 infinity-search
```

### Database Appears Empty

First check the volume:

```bash
docker volume inspect local-search_infinity-search-data
```

Then check the mount:

```bash
docker inspect infinity-search \
  --format='{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
```

The expected mount is:

```text
local-search_infinity-search-data -> /data
```

Do not immediately recreate or remove the volume.

Most importantly, do not run:

```bash
docker compose down -v
```

when trying to troubleshoot missing data.

### Port 18080 Is Already in Use

Check:

```bash
ss -ltnp | grep ':18080'
```

If necessary, change the host-side Compose port:

```yaml
ports:
  - "18081:8080"
```

The container port remains:

```text
8080
```

## Roadmap

Potential future improvements:

- Authentication
- Tags/categories
- Import/export functionality
- Bookmark editing
- Better search ranking
- Search suggestions
- Favicon support
- Backup and restore
- Healthcheck in Docker Compose
- Automated CI builds
- Automated Docker Hub publishing
- Versioned releases
- HTTPS/reverse-proxy deployment
- API documentation
- Automated tests
- Database migrations

## License

This project is currently intended for personal and educational use.

Add an explicit open-source license file such as MIT, Apache-2.0, or GPL-3.0 if you decide to distribute the project under one of those licenses.

---

## Current Release

**Version:** `1.0.0`

**Docker image:**

```text
duefix/infinity-search:1.0.0
```

**Docker Hub digest:**

```text
sha256:f1c344e088006a475c3af3aec594dc2e23d04bc1455254d5f54a7df7785b450c
```

**Container port:** `8080`

**Default host port:** `18080`

**Database:** SQLite + FTS5

**Database path:** `/data/local-search.db`

**Persistent volume:** `local-search_infinity-search-data`
