import type { Profile, Skill, Project, Experience, Education, Achievement, Socials, ApiCache } from '../types'

const API_BASE = '/api'

const cache: ApiCache = {}

async function fetchJSON<T>(url: string, cacheKey?: keyof ApiCache): Promise<T | null> {
  if (cacheKey && cache[cacheKey]) {
    return cache[cacheKey] as T
  }
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (cacheKey) {
      (cache as any)[cacheKey] = data
    }
    return data as T
  } catch {
    return null
  }
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete (cache as any)[k])
}

export async function getProfile(): Promise<Profile | null> {
  return fetchJSON<Profile>(`${API_BASE}/profile`, 'profile')
}

export async function getSkills(): Promise<Skill[] | null> {
  return fetchJSON<Skill[]>(`${API_BASE}/skills`, 'skills')
}

export async function getProjects(): Promise<Project[] | null> {
  return fetchJSON<Project[]>(`${API_BASE}/projects`, 'projects')
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projects = await getProjects()
  if (!projects) return null
  return projects.find(p => p.slug === slug) || null
}

export async function getExperience(): Promise<Experience[] | null> {
  return fetchJSON<Experience[]>(`${API_BASE}/experience`, 'experience')
}

export async function getEducation(): Promise<Education[] | null> {
  return fetchJSON<Education[]>(`${API_BASE}/education`, 'education')
}

export async function getAchievements(): Promise<Achievement[] | null> {
  return fetchJSON<Achievement[]>(`${API_BASE}/achievements`, 'achievements')
}

export async function getSocials(): Promise<Socials | null> {
  return fetchJSON<Socials>(`${API_BASE}/socials`, 'socials')
}

export async function postContact(data: { name: string; email: string; message: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

export async function postAsk(question: string): Promise<{ answer?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    return await res.json()
  } catch {
    return { error: 'Network error. Please try again.' }
  }
}
