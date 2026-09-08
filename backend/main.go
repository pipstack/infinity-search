package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type Site struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

func main() {
	dataDir := "/data"

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatal(err)
	}

	dbPath := filepath.Join(dataDir, "local-search.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := initDB(db); err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/api/health", healthHandler)

	http.HandleFunc("/api/sites", func(w http.ResponseWriter, r *http.Request) {
		sitesHandler(db, w, r)
	})

	http.HandleFunc("/api/sites/", func(w http.ResponseWriter, r *http.Request) {
		siteByIDHandler(db, w, r)
	})

	log.Println("local-search API listening on :8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

func initDB(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS sites (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL
		);
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS sites_fts
		USING fts5(
			name,
			url,
			description,
			content='sites',
			content_rowid='id'
		);
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TRIGGER IF NOT EXISTS sites_ai
		AFTER INSERT ON sites
		BEGIN
			INSERT INTO sites_fts(rowid, name, url, description)
			VALUES (new.id, new.name, new.url, new.description);
		END;
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TRIGGER IF NOT EXISTS sites_ad
		AFTER DELETE ON sites
		BEGIN
			INSERT INTO sites_fts(sites_fts, rowid, name, url, description)
			VALUES ('delete', old.id, old.name, old.url, old.description);
		END;
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TRIGGER IF NOT EXISTS sites_au
		AFTER UPDATE ON sites
		BEGIN
			INSERT INTO sites_fts(sites_fts, rowid, name, url, description)
			VALUES ('delete', old.id, old.name, old.url, old.description);

			INSERT INTO sites_fts(rowid, name, url, description)
			VALUES (new.id, new.name, new.url, new.description);
		END;
	`)
	if err != nil {
		return err
	}

	// Rebuild the FTS index from the existing sites table.
	// This also picks up records that existed before FTS5 was enabled.
	_, err = db.Exec(`
		INSERT INTO sites_fts(sites_fts)
		VALUES ('rebuild');
	`)
	if err != nil {
		return err
	}

	return nil
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
	})
}

func sitesHandler(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getSites(db, w, r)

	case http.MethodPost:
		addSite(db, w, r)

	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func getSites(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))

	var (
		rows *sql.Rows
		err  error
	)

	if query == "" {
		rows, err = db.Query(`
			SELECT id, name, url, description, created_at
			FROM sites
			ORDER BY id DESC
		`)
	} else {
		ftsQuery := buildFTSQuery(query)

		rows, err = db.Query(`
			SELECT s.id, s.name, s.url, s.description, s.created_at
			FROM sites s
			JOIN sites_fts f ON f.rowid = s.id
			WHERE sites_fts MATCH ?
			ORDER BY bm25(sites_fts), s.id DESC
		`, ftsQuery)
	}

	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database error")
		return
	}

	defer rows.Close()

	sites := []Site{}

	for rows.Next() {
		var site Site

		if err := rows.Scan(
			&site.ID,
			&site.Name,
			&site.URL,
			&site.Description,
			&site.CreatedAt,
		); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "database error")
			return
		}

		sites = append(sites, site)
	}

	if err := rows.Err(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusOK, sites)
}

func buildFTSQuery(query string) string {
	words := strings.Fields(query)

	escaped := make([]string, 0, len(words))

	for _, word := range words {
		word = strings.TrimSpace(word)

		if word == "" {
			continue
		}

		word = strings.ReplaceAll(word, `"`, `""`)
		escaped = append(escaped, `"`+word+`"`)
	}

	return strings.Join(escaped, " AND ")
}

func addSite(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name        string `json:"name"`
		URL         string `json:"url"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.URL = strings.TrimSpace(input.URL)
	input.Description = strings.TrimSpace(input.Description)

	if input.Name == "" {
		writeJSONError(w, http.StatusBadRequest, "name is required")
		return
	}

	if input.URL == "" {
		writeJSONError(w, http.StatusBadRequest, "url is required")
		return
	}

	if !strings.HasPrefix(input.URL, "http://") &&
		!strings.HasPrefix(input.URL, "https://") {
		writeJSONError(
			w,
			http.StatusBadRequest,
			"url must start with http:// or https://",
		)
		return
	}

	createdAt := time.Now().UTC().Format(time.RFC3339)

	result, err := db.Exec(`
		INSERT INTO sites (name, url, description, created_at)
		VALUES (?, ?, ?, ?)
	`, input.Name, input.URL, input.Description, createdAt)

	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database error")
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusCreated, Site{
		ID:          id,
		Name:        input.Name,
		URL:         input.URL,
		Description: input.Description,
		CreatedAt:   createdAt,
	})
}

func siteByIDHandler(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	idText := strings.TrimPrefix(r.URL.Path, "/api/sites/")

	if idText == "" {
		writeJSONError(w, http.StatusBadRequest, "site id is required")
		return
	}

	var id int64

	if _, err := fmt.Sscanf(idText, "%d", &id); err != nil || id <= 0 {
		writeJSONError(w, http.StatusBadRequest, "invalid site id")
		return
	}

	switch r.Method {
	case http.MethodDelete:
		deleteSite(db, w, id)

	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func deleteSite(db *sql.DB, w http.ResponseWriter, id int64) {
	result, err := db.Exec(`
		DELETE FROM sites
		WHERE id = ?
	`, id)

	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database error")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database error")
		return
	}

	if rowsAffected == 0 {
		writeJSONError(w, http.StatusNotFound, "site not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"id":      id,
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("JSON encode error: %v", err)
	}
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}
