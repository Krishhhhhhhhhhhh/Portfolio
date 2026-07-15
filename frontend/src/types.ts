export interface Profile {
  name: string
  fullName: string
  title: string
  tagline: string
  location: string
  email: string
  phone: string
  linkedin: string
  github: string
  bio: string
  avatarUrl: string
  resumeUrl: string
  photoUrl: string
}

export interface Skill {
  category: string
  items: string[]
}

export interface Project {
  name: string
  description: string
  tech: string[]
  repo: string
  live: string
  highlights: string[]
  slug: string
}

export interface Experience {
  role: string
  company: string
  location: string
  period: string
  stack: string[]
  highlights: string[]
}

export interface Education {
  degree: string
  institution: string
  location: string
  period: string
  score: string
}

export interface Achievement {
  title: string
  event: string
  date: string
  description: string
}

export interface Socials {
  linkedin: string
  github: string
  email: string
}

export interface Line {
  id: string
  type: 'command' | 'text' | 'error' | 'success' | 'system' | 'image' | 'banner' | 'matrix' | 'fade' | 'form-prompt' | 'link'
  content?: string | ImageContent | LinkContent
}

export interface ImageContent {
  src: string
  alt: string
}

export interface LinkContent {
  href: string
  label: string
  prefix?: string
}

export interface FormField {
  key: string
  label: string
  prompt: string
}

export interface FormMode {
  active: boolean
  fields: FormField[]
  step: number
  data: Record<string, string>
}

export interface CommandContext {
  addLine: (line: Omit<Line, 'id'>) => void
  addLines: (lines: Omit<Line, 'id'>[]) => void
  clear: () => void
  setTheme: (t: string) => void
  getTheme: () => string
  getHistory: () => string[]
  enterFormMode: () => void
  exitFormMode: () => void
  openUrl: (url: string) => void
}

export interface CommandDef {
  description: string
  usage: string
  category?: string
  helpText?: string[]
  skipHelpCheck?: boolean
  action: (args: string[], ctx: CommandContext) => Promise<Omit<Line, 'id'>[]>
}

export interface ApiCache {
  profile?: Profile
  skills?: Skill[]
  projects?: Project[]
  experience?: Experience[]
  education?: Education[]
  achievements?: Achievement[]
  socials?: Socials
}
