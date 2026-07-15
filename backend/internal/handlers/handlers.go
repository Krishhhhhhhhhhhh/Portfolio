package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/krishna/portfolio-backend/internal/data"
	"github.com/krishna/portfolio-backend/internal/models"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func jsonResponse(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetProfile())
}

func (h *Handler) GetProfilePhoto(w http.ResponseWriter, r *http.Request) {
	photoPath := os.Getenv("PHOTO_PATH")
	if photoPath == "" {
		photoPath = "./profile.jpg"
	}
	http.ServeFile(w, r, photoPath)
}

func (h *Handler) GetSkills(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetSkills())
}

func (h *Handler) GetProjects(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetProjects())
}

func (h *Handler) GetProjectBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		jsonResponse(w, http.StatusBadRequest, models.ErrorResponse{Error: "slug is required"})
		return
	}
	proj := data.GetProjectBySlug(slug)
	if proj == nil {
		jsonResponse(w, http.StatusNotFound, models.ErrorResponse{Error: "project not found"})
		return
	}
	jsonResponse(w, http.StatusOK, proj)
}

func (h *Handler) GetExperience(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetExperience())
}

func (h *Handler) GetEducation(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetEducation())
}

func (h *Handler) GetAchievements(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetAchievements())
}

func (h *Handler) GetSocials(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, data.GetSocials())
}

func (h *Handler) GetResume(w http.ResponseWriter, r *http.Request) {
	resumePath := os.Getenv("RESUME_PATH")
	if resumePath == "" {
		resumePath = "./resume.pdf"
	}
	w.Header().Set("Content-Type", "application/pdf")
	http.ServeFile(w, r, resumePath)
}

func (h *Handler) GetHealth(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *Handler) PostAsk(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 10_000)
	var req models.AskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body."})
		return
	}

	req.Question = strings.TrimSpace(req.Question)
	if req.Question == "" {
		jsonResponse(w, http.StatusBadRequest, models.ErrorResponse{Error: "Question is required."})
		return
	}

	answer, err := h.askLLM(req.Question)
	if err != nil {
		log.Printf("LLM error: %v", err)
		jsonResponse(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get answer. Please try again."})
		return
	}

	jsonResponse(w, http.StatusOK, models.AskResponse{Answer: answer})
}

func (h *Handler) askLLM(question string) (string, error) {
	raw := os.Getenv("GEMINI_API_KEY")
	keys := strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == ' ' })
	if len(keys) == 0 || keys[0] == "" {
		return h.fallbackAnswer(question), nil
	}

	profile := data.GetProfile()
	skills := data.GetSkills()
	projects := data.GetProjects()
	exp := data.GetExperience()
	edu := data.GetEducation()
	ach := data.GetAchievements()

	var contextStr strings.Builder
	contextStr.WriteString(fmt.Sprintf(`You are a helpful assistant answering questions about Krishna Pathak, a full-stack developer.
Answer concisely based only on the data below. If the answer isn't in the data, say so.

PROFILE:
Name: %s
Title: %s
Bio: %s
Location: %s
Email: %s

SKILLS:
`, profile.FullName, profile.Title, profile.Bio, profile.Location, profile.Email))

	for _, s := range skills {
		contextStr.WriteString(fmt.Sprintf("- %s: %s\n", s.Category, strings.Join(s.Items, ", ")))
	}

	contextStr.WriteString("\nEXPERIENCE:\n")
	for _, e := range exp {
		contextStr.WriteString(fmt.Sprintf("- %s at %s (%s)\n", e.Role, e.Company, e.Period))
		for _, h := range e.Highlights {
			contextStr.WriteString(fmt.Sprintf("  - %s\n", h))
		}
	}

	contextStr.WriteString("\nPROJECTS:\n")
	for _, p := range projects {
		contextStr.WriteString(fmt.Sprintf("- %s: %s (Tech: %s)\n", p.Name, p.Description, strings.Join(p.Tech, ", ")))
	}

	contextStr.WriteString("\nEDUCATION:\n")
	for _, e := range edu {
		contextStr.WriteString(fmt.Sprintf("- %s - %s (%s)\n", e.Degree, e.Institution, e.Score))
	}

	contextStr.WriteString("\nACHIEVEMENTS:\n")
	for _, a := range ach {
		contextStr.WriteString(fmt.Sprintf("- %s (%s)\n", a.Title, a.Event))
	}

	prompt := fmt.Sprintf(`%s

Answer the following question about Krishna Pathak. Be concise (2-3 sentences max).
If the question is not related to Krishna's background, politely redirect.

Question: %s

Answer:`, contextStr.String(), question)

	body := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"maxOutputTokens": 200,
			"temperature":     0.3,
		},
	}

	bodyJSON, _ := json.Marshal(body)

	var lastErr error
	for _, key := range keys {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", key)

		req, err := http.NewRequest("POST", apiURL, bytes.NewReader(bodyJSON))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == 429 || resp.StatusCode == 403 {
			lastErr = fmt.Errorf("key exhausted (HTTP %d)", resp.StatusCode)
			resp.Body.Close()
			continue
		}

		respBody, _ := io.ReadAll(resp.Body)
		var result struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal(respBody, &result); err != nil || len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("LLM returned unexpected response")
			continue
		}

		return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), nil
	}

	return "", lastErr
}

func (h *Handler) fallbackAnswer(question string) string {
	q := strings.ToLower(question)

	skills := data.GetSkills()
	projects := data.GetProjects()
	exp := data.GetExperience()
	profile := data.GetProfile()

	if strings.Contains(q, "skill") || strings.Contains(q, "tech") || strings.Contains(q, "know") || strings.Contains(q, "language") || strings.Contains(q, "stack") {
		var parts []string
		for _, s := range skills {
			parts = append(parts, fmt.Sprintf("%s: %s", s.Category, strings.Join(s.Items, ", ")))
		}
		return fmt.Sprintf("%s's skills include: %s", profile.Name, strings.Join(parts, ". "))
	}

	if strings.Contains(q, "project") || strings.Contains(q, "build") || strings.Contains(q, "made") || strings.Contains(q, "create") {
		var names []string
		for _, p := range projects {
			names = append(names, p.Name)
		}
		return fmt.Sprintf("%s has built: %s. Use the 'projects' command for details.", profile.Name, strings.Join(names, ", "))
	}

	if strings.Contains(q, "experience") || strings.Contains(q, "work") || strings.Contains(q, "job") || strings.Contains(q, "intern") {
		var lines []string
		for _, e := range exp {
			lines = append(lines, fmt.Sprintf("%s at %s (%s)", e.Role, e.Company, e.Period))
		}
		return fmt.Sprintf("%s's experience: %s", profile.Name, strings.Join(lines, "; "))
	}

	if strings.Contains(q, "education") || strings.Contains(q, "study") || strings.Contains(q, "degree") || strings.Contains(q, "college") || strings.Contains(q, "school") {
		edu := data.GetEducation()
		var lines []string
		for _, e := range edu {
			lines = append(lines, fmt.Sprintf("%s, %s (%s)", e.Degree, e.Institution, e.Score))
		}
		return fmt.Sprintf("Education: %s", strings.Join(lines, "; "))
	}

	if strings.Contains(q, "achievement") || strings.Contains(q, "award") || strings.Contains(q, "prize") || strings.Contains(q, "hackathon") || strings.Contains(q, "competition") {
		ach := data.GetAchievements()
		var lines []string
		for _, a := range ach {
			lines = append(lines, fmt.Sprintf("%s at %s", a.Title, a.Event))
		}
		return fmt.Sprintf("Achievements: %s", strings.Join(lines, "; "))
	}

	if strings.Contains(q, "contact") || strings.Contains(q, "email") || strings.Contains(q, "reach") || strings.Contains(q, "message") {
		return fmt.Sprintf("You can reach %s at %s or use the 'contact' command to send a message directly.", profile.Name, profile.Email)
	}

	if strings.Contains(q, "resume") || strings.Contains(q, "cv") || strings.Contains(q, "download") {
		return fmt.Sprintf("%s's resume is available to download. Use the 'resume' command to open it.", profile.Name)
	}

	if strings.Contains(q, "hello") || strings.Contains(q, "hi ") || strings.Contains(q, "hey") || strings.Contains(q, "who are") {
		return fmt.Sprintf("Hi! I'm %s, %s. %s Type 'help' to see what I can do.", profile.FullName, profile.Title, profile.Tagline)
	}

	if strings.Contains(q, "docker") || strings.Contains(q, "ci/cd") || strings.Contains(q, "devops") || strings.Contains(q, "deploy") {
		return fmt.Sprintf("Yes! %s has experience with Docker, GitHub Actions, and CI/CD pipelines from their work at Shivrai Technologies.", profile.Name)
	}

	return fmt.Sprintf("I'm not sure about that. Try asking about skills, projects, experience, education, achievements, or contact info. Type 'help' to explore.")
}
