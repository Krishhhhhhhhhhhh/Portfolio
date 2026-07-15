package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/krishna/portfolio-backend/internal/handlers"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	h := handlers.NewHandler()

	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendURL},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/api/health", h.GetHealth)
	r.Get("/api/profile", h.GetProfile)
	r.Get("/api/profile/photo", h.GetProfilePhoto)
	r.Get("/api/skills", h.GetSkills)
	r.Get("/api/projects", h.GetProjects)
	r.Get("/api/projects/{slug}", h.GetProjectBySlug)
	r.Get("/api/experience", h.GetExperience)
	r.Get("/api/education", h.GetEducation)
	r.Get("/api/achievements", h.GetAchievements)
	r.Get("/api/socials", h.GetSocials)
	r.Get("/api/resume", h.GetResume)

	r.Post("/api/ask", h.PostAsk)

	log.Printf("Server starting on :%s (CORS: %s)", port, frontendURL)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
