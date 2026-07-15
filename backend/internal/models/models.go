package models

type Profile struct {
	Name      string `json:"name"`
	FullName  string `json:"fullName"`
	Title     string `json:"title"`
	Tagline   string `json:"tagline"`
	Location  string `json:"location"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	LinkedIn  string `json:"linkedin"`
	GitHub    string `json:"github"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatarUrl"`
	ResumeURL string `json:"resumeUrl"`
	PhotoURL  string `json:"photoUrl"`
}

type Skill struct {
	Category string   `json:"category"`
	Items    []string `json:"items"`
}

type Project struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Tech        []string `json:"tech"`
	Repo        string   `json:"repo"`
	Live        string   `json:"live"`
	Highlights  []string `json:"highlights"`
	Slug        string   `json:"slug"`
}

type Experience struct {
	Role       string   `json:"role"`
	Company    string   `json:"company"`
	Location   string   `json:"location"`
	Period     string   `json:"period"`
	Stack      []string `json:"stack"`
	Highlights []string `json:"highlights"`
}

type Education struct {
	Degree      string `json:"degree"`
	Institution string `json:"institution"`
	Location    string `json:"location"`
	Period      string `json:"period"`
	Score       string `json:"score"`
}

type Achievement struct {
	Title       string `json:"title"`
	Event       string `json:"event"`
	Date        string `json:"date"`
	Description string `json:"description"`
}

type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

type AskRequest struct {
	Question string `json:"question"`
}

type AskResponse struct {
	Answer string `json:"answer"`
}

type ContactResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type Socials struct {
	LinkedIn string `json:"linkedin"`
	GitHub   string `json:"github"`
	Email    string `json:"email"`
}
