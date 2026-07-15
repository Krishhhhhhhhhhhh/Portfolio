package data

import "github.com/krishna/portfolio-backend/internal/models"

var Profile = models.Profile{
	Name:      "Krishna",
	FullName:  "Krishna Pathak",
	Title:     "Full Stack Developer (MERN)",
	Tagline:   "Building full-stack experiences with React, Node.js, and Go",
	Location:  "India",
	Email:     "krishnapathak8595@gmail.com",
	Phone:     "9028448595",
	LinkedIn:  "https://linkedin.com/in/",
	GitHub:    "https://github.com/",
	Bio:       "Full Stack Developer (MERN) with experience building scalable web applications, RESTful APIs, and real-time systems. Passionate about open source, terminal UIs, and developer tooling. Active hackathon participant and state-level competition winner.",
	AvatarURL: "/api/profile/photo",
	ResumeURL: "/api/resume",
	PhotoURL:  "/api/profile/photo",
}

var Skills = []models.Skill{
	{Category: "Languages", Items: []string{"JavaScript", "TypeScript", "C/C++", "Java", "HTML/CSS"}},
	{Category: "Frameworks", Items: []string{"Next.js", "React.js", "Express.js", "Node.js", "Tailwind CSS"}},
	{Category: "Developer Tools", Items: []string{"Git", "GitHub", "Postman", "VS Code", "PyCharm", "IntelliJ", "Eclipse"}},
	{Category: "DevOps & Cloud", Items: []string{"Docker", "GitHub Actions", "CI/CD Pipelines"}},
	{Category: "Databases & ORMs", Items: []string{"MySQL", "MongoDB", "Redis", "Prisma ORM"}},
}

var Projects = []models.Project{
	{
		Name:        "AI Chat Application",
		Description: "DeepSeek-style LLM chat app with real-time conversations, OpenRouter integration, and persistent chat history.",
		Slug:        "ai-chat-application",
		Tech:        []string{"Next.js", "React.js", "MongoDB", "Clerk", "OpenRouter"},
		Repo:        "",
		Live:        "",
		Highlights: []string{
			"Real-time LLM conversations via OpenRouter API",
			"Fallback handling for API failures and quota limits",
			"Clerk authentication with persistent chat storage",
		},
	},
	{
		Name:        "Pingup",
		Description: "Full-stack social media platform with real-time chat, feed, follow/unfollow, friend requests, and stories.",
		Slug:        "pingup",
		Tech:        []string{"React.js", "Node.js", "Clerk", "Ingest", "ImageKit"},
		Repo:        "",
		Live:        "",
		Highlights: []string{
			"Auth/profile/onboarding via Clerk",
			"Background job scheduling via Ingest",
			"ImageKit media delivery with real-time chat",
			"Feed, follow/unfollow, friend requests, stories",
		},
	},
	{
		Name:        "Crypto Price Tracker",
		Description: "Real-time cryptocurrency price tracking with responsive design and optimized API calls.",
		Slug:        "crypto-price-tracker",
		Tech:        []string{"HTML", "CSS", "React", "CoinGecko API"},
		Repo:        "",
		Live:        "",
		Highlights: []string{
			"Real-time price tracking from CoinGecko API",
			"Responsive design across devices",
			"Optimized API calls and state management",
		},
	},
}

var Experience = []models.Experience{
	{
		Role:     "Full Stack Developer Intern (MERN)",
		Company:  "Shivrai Technologies",
		Location: "Hybrid",
		Period:   "June 2025 – August 2025",
		Stack:    []string{"React.js", "Node.js", "MongoDB", "Docker", "GitHub Actions"},
		Highlights: []string{
			"Built 5+ full-stack modules (React.js, Node.js, MongoDB) digitizing farm data workflows",
			"Designed secure RESTful APIs with JWT auth + RBAC",
			"Optimized Docker-based CI/CD pipelines via GitHub Actions for hybrid cloud sync",
			"Collaborated in a 4+ dev Agile team (sprint planning, code reviews)",
		},
	},
	{
		Role:     "Frontend Developer Intern",
		Company:  "Softronixx",
		Location: "Remote",
		Period:   "July 2022 – August 2022",
		Stack:    []string{"HTML/CSS", "JavaScript", "React"},
		Highlights: []string{
			"Built responsive UIs across devices and platforms",
			"Debugging and maintenance for UI issues",
			"Cross-team collaboration on scalable, performant code",
		},
	},
}

var Education = []models.Education{
	{
		Degree:      "B.E. Computer Engineering",
		Institution: "Sinhagad Institute of Technology and Science, Narhe",
		Location:    "Pune",
		Period:      "",
		Score:       "SGPA 8.53",
	},
	{
		Degree:      "Diploma in Computer Engineering",
		Institution: "MIT-WPU, Kothrud",
		Location:    "Pune",
		Period:      "Aug 2021 – May 2024",
		Score:       "86.57%",
	},
}

var Achievements = []models.Achievement{
	{
		Title:       "2nd Prize — State-Level Project Competition",
		Event:       "Technovision 2023",
		Date:        "2023",
		Description: "Awarded second place at AISSMS College for innovative project demonstration.",
	},
	{
		Title:       "3rd Prize — National-Level Startup & Poster Competition",
		Event:       "Technothon 2023",
		Date:        "2023",
		Description: "Awarded third place at Anantrao Pawar College for startup pitch and poster presentation.",
	},
	{
		Title:       "Active Hackathon Participant",
		Event:       "Multiple Hackathons",
		Date:        "2022–2025",
		Description: "Regular participant in various hackathons and coding competitions.",
	},
}

func GetProfile() models.Profile {
	return Profile
}

func GetSkills() []models.Skill {
	return Skills
}

func GetProjects() []models.Project {
	return Projects
}

func GetProjectBySlug(slug string) *models.Project {
	for _, p := range Projects {
		if p.Slug == slug {
			return &p
		}
	}
	return nil
}

func GetExperience() []models.Experience {
	return Experience
}

func GetEducation() []models.Education {
	return Education
}

func GetAchievements() []models.Achievement {
	return Achievements
}

func GetSocials() models.Socials {
	return models.Socials{
		LinkedIn: Profile.LinkedIn,
		GitHub:   Profile.GitHub,
		Email:    Profile.Email,
	}
}
