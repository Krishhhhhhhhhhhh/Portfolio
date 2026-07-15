import type { CommandDef, CommandContext, Line } from '../types'
import * as api from '../api/client'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function fuzzyFind(input: string, commands: Record<string, CommandDef>, threshold = 3): string | null {
  const names = Object.keys(commands)
  let best: string | null = null
  let bestDist = threshold + 1
  for (const name of names) {
    const dist = levenshtein(input, name)
    if (dist < bestDist) {
      bestDist = dist
      best = name
    }
  }
  return best
}

const categories: Record<string, string[]> = {}
const commands: Record<string, CommandDef> = {}

function register(category: string, name: string, cmd: CommandDef) {
  cmd.category = category
  commands[name] = cmd
  if (!categories[category]) categories[category] = []
  categories[category].push(name)
}

function fmtCategory(name: string): string {
  const map: Record<string, string> = {
    core: 'Core / Navigation',
    about: 'About',
    skills: 'Skills',
    projects: 'Projects',
    experience: 'Experience',
    social: 'Social & Links',
    contact: 'Contact',
    fun: 'Fun / Easter Eggs',
  }
  return map[name] || name
}

// ─── Core / Navigation ────────────────────────────────────────

register('core', 'help', {
  description: 'Lists all available commands grouped by category',
  usage: 'help [command]',
  helpText: ["With no arguments, lists every command.", "Use 'help <command>' for details on a specific command."],
  async action(args, ctx) {
    if (args.length > 0) {
      const all = { ...commands }
      const target = args[0].toLowerCase()
      const cmd = all[target]
      if (!cmd) return [{ type: 'error' as const, content: `No help entry for '${args[0]}'` }]
      return [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `${target} — ${cmd.description}` },
        { type: 'text' as const, content: `  Usage: ${cmd.usage}` },
        { type: 'text' as const, content: '' },
      ]
    }

    const lines: string[] = ['']
    const maxLen = Math.max(...Object.keys(commands).map(k => k.length)) + 2

    for (const [cat, names] of Object.entries(categories)) {
      lines.push(`  ${fmtCategory(cat)}`)
      lines.push(`  ${'─'.repeat(40)}`)
      for (const name of names) {
        lines.push(`    ${name.padEnd(maxLen)}${commands[name].description}`)
      }
      lines.push('')
    }

    lines.push("  Tab autocompletes commands.  ↑/↓ for history.  Ctrl+L to clear.")
    lines.push('')

    return lines.map(l => ({ type: 'text' as const, content: l }))
  },
})

register('core', 'clear', {
  description: 'Clears the terminal screen',
  usage: 'clear',
  async action(_args, ctx) {
    ctx.clear()
    return []
  },
})

register('core', 'whoami', {
  description: 'One-liner identity and title',
  usage: 'whoami',
  async action() {
    const p = await api.getProfile()
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: `  ${p?.fullName || 'Krishna Pathak'}` },
      { type: 'text' as const, content: `  ${p?.title || 'Full Stack Developer (MERN)'}` },
      { type: 'text' as const, content: `  ${p?.tagline || ''}` },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('core', 'banner', {
  description: 'Re-renders the ASCII art welcome banner',
  usage: 'banner',
  async action() {
    return [{ type: 'banner' as const }]
  },
})

register('core', 'history', {
  description: 'Lists all commands typed in this session',
  usage: 'history',
  async action(_args, ctx) {
    const hist = ctx.getHistory()
    if (hist.length === 0) return [{ type: 'text' as const, content: '  No commands in history.' }]
    const lines = hist.map((cmd, i) => ({ type: 'text' as const, content: `  ${i + 1}  ${cmd}` }))
    lines.unshift({ type: 'text' as const, content: '' })
    return lines
  },
})

register('core', 'echo', {
  description: 'Prints back the input text',
  usage: 'echo <text>',
  async action(args) {
    return [{ type: 'text' as const, content: args.join(' ') }]
  },
})

register('core', 'date', {
  description: 'Shows current date and time',
  usage: 'date',
  async action() {
    return [{ type: 'text' as const, content: new Date().toString() }]
  },
})

register('core', 'pwd', {
  description: 'Prints current working directory',
  usage: 'pwd',
  async action() {
    return [{ type: 'text' as const, content: '/home/krishna/portfolio' }]
  },
})

register('core', 'ls', {
  description: 'Lists top-level sections like directories',
  usage: 'ls',
  async action() {
    const names = Object.keys(commands).sort()
    const lines: string[] = ['']
    const cols = 4
    for (let i = 0; i < names.length; i += cols) {
      const row = names.slice(i, i + cols).map(n => n.padEnd(16))
      lines.push(`  ${row.join('')}`)
    }
    lines.push('')
    return lines.map(l => ({ type: 'text' as const, content: l }))
  },
})

register('core', 'cat', {
  description: 'View details of a section or project',
  usage: 'cat <section|project-name>',
  async action(args, ctx) {
    if (args.length === 0) return [{ type: 'error' as const, content: 'Usage: cat <section>. Try: cat about, cat <project-name>' }]
    const query = args.join(' ').toLowerCase()
    if (query === 'about' || query === 'profile') return commands['about']!.action([], ctx)
    if (query === 'skills' || query === 'stack') return commands['skills']!.action([], ctx)
    if (query === 'projects') return commands['projects']!.action([], ctx)
    if (query === 'experience' || query === 'exp') return commands['experience']!.action([], ctx)
    if (query === 'education') return commands['education']!.action([], ctx)
    if (query === 'achievements') return commands['achievements']!.action([], ctx)
    const proj = (await api.getProjects())?.find(p => p.name.toLowerCase().includes(query) || p.slug === query)
    if (proj) {
      const lines: Omit<Line, 'id'>[] = [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `  ${proj.name}` },
        { type: 'text' as const, content: `  ${'─'.repeat(Math.min(proj.name.length + 2, 40))}` },
        { type: 'text' as const, content: `  ${proj.description}` },
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `  Stack: ${proj.tech.join(', ')}` },
      ]
      if (proj.highlights?.length) {
        lines.push({ type: 'text' as const, content: '' })
        for (const h of proj.highlights) lines.push({ type: 'text' as const, content: `  › ${h}` })
      }
      if (proj.repo) lines.push({ type: 'text' as const, content: `  Repo: ${proj.repo}` })
      if (proj.live) lines.push({ type: 'text' as const, content: `  Live: ${proj.live}` })
      lines.push({ type: 'text' as const, content: '' })
      return lines
    }
    return [{ type: 'error' as const, content: `cat: ${args.join(' ')}: No such section or project.` }]
  },
})

register('core', 'neofetch', {
  description: 'System-info style profile display',
  usage: 'neofetch',
  async action() {
    const p = await api.getProfile()
    if (!p) return [{ type: 'error' as const, content: 'Failed to fetch profile.' }]
    const info = [
      ['User', p.name],
      ['Hostname', 'portfolio'],
      ['OS', 'Arch Linux x86_64'],
      ['Shell', 'zsh 5.9'],
      ['DE', 'Hyprland'],
      ['Terminal', 'Portfolio Terminal'],
      ['', ''],
      ['Name', p.fullName],
      ['Title', p.title],
      ['Location', p.location],
      ['Email', p.email],
    ]
    const maxL = Math.max(...info.filter(i => i[0]).map(i => i[0].length))
    const ascii = ['             ', '         ', '           ', '             ']
    const lines: Omit<Line, 'id'>[] = [{ type: 'text' as const, content: '' }]
    for (let i = 0; i < Math.max(ascii.length, info.length); i++) {
      const a = ascii[i] || ''
      const inf = info[i]
      lines.push({
        type: 'text' as const,
        content: `  ${a}    ${inf ? `${inf[0].padEnd(maxL)}  :  ${inf[1]}` : ''}`,
      })
    }
    lines.push({ type: 'text' as const, content: '' })
    return lines
  },
})

register('core', 'ping', {
  description: 'Ping the portfolio server',
  usage: 'ping',
  async action() {
    try {
      const res = await fetch('/api/health')
      const d = await res.json()
      return [{ type: 'success' as const, content: `pong! Server status: ${d.status} (${d.timestamp})` }]
    } catch {
      return [{ type: 'error' as const, content: 'ping: Request timed out. Server may be offline.' }]
    }
  },
})

// ─── About ────────────────────────────────────────────────────

register('about', 'about', {
  description: 'Full bio — background, what you do, what you build',
  usage: 'about [--short|-s | --photo]',
  helpText: [
    '--short, -s   One-paragraph TL;DR version',
    '--photo       Show profile photo inline',
  ],
  async action(args) {
    const p = await api.getProfile()
    if (!p) return [{ type: 'error' as const, content: 'Failed to fetch profile.' }]

    if (args.includes('--short') || args.includes('-s')) {
      return [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `  ${p.fullName} — ${p.title}. ${p.tagline}.` },
        { type: 'text' as const, content: `  ${p.bio}` },
        { type: 'text' as const, content: '' },
      ]
    }

    const lines: Omit<Line, 'id'>[] = [
      { type: 'text' as const, content: '' },
    ]

    if (args.includes('--photo')) {
      lines.push({
        type: 'image' as const,
        content: { src: p.photoUrl, alt: p.name },
      })
      lines.push({ type: 'text' as const, content: '' })
    }

    const edu = await api.getEducation()
    const ach = await api.getAchievements()

    lines.push(
      { type: 'text' as const, content: `  ${p.fullName}` },
      { type: 'text' as const, content: `  ${p.title}` },
      { type: 'text' as const, content: `  ${p.location}` },
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: `  ${p.bio}` },
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: '  Education:' },
    )

    if (edu) {
      for (const e of edu) {
        lines.push({ type: 'text' as const, content: `    ${e.degree} — ${e.institution} (${e.score})` })
      }
    }

    lines.push({ type: 'text' as const, content: '' })
    lines.push({ type: 'text' as const, content: '  Achievements:' })

    if (ach) {
      for (const a of ach) {
        lines.push({ type: 'text' as const, content: `    • ${a.title} — ${a.event}` })
      }
    }

    lines.push({ type: 'text' as const, content: '' })
    return lines
  },
})

// ─── Skills ───────────────────────────────────────────────────

register('skills', 'skills', {
  description: 'Lists all skills grouped by category',
  usage: 'skills [--frontend | --backend | --devops | --languages | --tools]',
  helpText: [
    '--frontend    Frontend skills only',
    '--backend     Backend skills only',
    '--devops      DevOps/Cloud skills only',
    '--languages   Programming languages only',
    '--tools       Developer tools only',
  ],
  async action(args) {
    const data = await api.getSkills()
    if (!data) return [{ type: 'error' as const, content: 'Failed to fetch skills.' }]

    const filterMap: Record<string, string> = {
      '--frontend': 'Frameworks',
      '--backend': 'Backend',
      '--devops': 'DevOps & Cloud',
      '--languages': 'Languages',
      '--tools': 'Developer Tools',
    }

    let filtered = data
    for (const [flag, cat] of Object.entries(filterMap)) {
      if (args.includes(flag)) {
        filtered = data.filter(s => s.category === cat)
        break
      }
    }

    const lines: Omit<Line, 'id'>[] = [{ type: 'text' as const, content: '' }]
    for (const s of filtered) {
      lines.push({ type: 'text' as const, content: `  ${s.category}:` })
      lines.push({ type: 'text' as const, content: `    ${s.items.join(', ')}` })
      lines.push({ type: 'text' as const, content: '' })
    }
    return lines
  },
})

register('skills', 'stack', {
  description: 'Alias for skills',
  usage: 'stack [--frontend | --backend | --devops | --languages | --tools]',
  async action(args, ctx) {
    return commands['skills']!.action(args, ctx)
  },
})

// ─── Projects ─────────────────────────────────────────────────

register('projects', 'projects', {
  description: 'Lists all projects with descriptions',
  usage: 'projects [--list | <name>]',
  helpText: [
    '--list        Show with index numbers',
    '<name>        Show detailed info for a specific project',
  ],
  async action(args) {
    const data = await api.getProjects()
    if (!data) return [{ type: 'error' as const, content: 'Failed to fetch projects.' }]

    if (args.length > 0 && !args.includes('--list')) {
      const query = args.join(' ').toLowerCase()
      const proj = data.find(p => p.name.toLowerCase().includes(query) || p.slug === query)
      if (!proj) return [{ type: 'error' as const, content: `Project '${args.join(' ')}' not found.` }]
      const lines: Omit<Line, 'id'>[] = [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `  ${proj.name}` },
        { type: 'text' as const, content: `  ${'─'.repeat(Math.min(proj.name.length + 2, 40))}` },
        { type: 'text' as const, content: `  ${proj.description}` },
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `  Stack: ${proj.tech.join(', ')}` },
      ]
      if (proj.highlights?.length) {
        lines.push({ type: 'text' as const, content: '' })
        lines.push({ type: 'text' as const, content: `  Key Features:` })
        for (const h of proj.highlights) lines.push({ type: 'text' as const, content: `    › ${h}` })
      }
      if (proj.repo) lines.push({ type: 'text' as const, content: `  Repo: ${proj.repo}` })
      if (proj.live) lines.push({ type: 'text' as const, content: `  Live: ${proj.live}` })
      lines.push({ type: 'text' as const, content: '' })
      return lines
    }

    const numbered = args.includes('--list')
    const lines: Omit<Line, 'id'>[] = [{ type: 'text' as const, content: '' }]
    for (let i = 0; i < data.length; i++) {
      const p = data[i]
      const prefix = numbered ? `  ${i + 1}. ` : '  📦 '
      lines.push(
        { type: 'text' as const, content: `${prefix}${p.name}` },
        { type: 'text' as const, content: `     ${p.description}` },
        { type: 'text' as const, content: `     ${p.tech.join('  ')}` },
      )
      if (p.repo) lines.push({ type: 'text' as const, content: `     repo: ${p.repo}` })
      if (p.live) lines.push({ type: 'text' as const, content: `     live: ${p.live}` })
      lines.push({ type: 'text' as const, content: '' })
    }
    return lines
  },
})

register('projects', 'open', {
  description: 'Opens a project\'s live URL or GitHub in a new tab',
  usage: 'open <project-name>',
  async action(args) {
    if (args.length === 0) return [{ type: 'error' as const, content: 'Usage: open <project-name>' }]
    const data = await api.getProjects()
    const query = args.join(' ').toLowerCase()
    const proj = data?.find(p => p.name.toLowerCase().includes(query) || p.slug === query)
    if (!proj) return [{ type: 'error' as const, content: `Project '${args.join(' ')}' not found.` }]
    const url = proj.live || proj.repo
    if (url) openUrl(url)
    return [
      { type: 'text' as const, content: '' },
      { type: 'success' as const, content: `  Opening ${proj.name} → ${url}` },
      { type: 'text' as const, content: '' },
    ]
  },
})

// ─── Experience ───────────────────────────────────────────────

register('experience', 'experience', {
  description: 'Work history, timeline style',
  usage: 'experience [--current | <company>]',
  helpText: [
    '--current       Only current role',
    '<company>       Full details for a company',
  ],
  async action(args) {
    const data = await api.getExperience()
    if (!data) return [{ type: 'error' as const, content: 'Failed to fetch experience.' }]

    if (args.includes('--current')) {
      const cur = data.find(e => e.period.includes('Present') || e.period.includes('2025'))
      if (!cur) return [{ type: 'text' as const, content: '  No current role found.' }]
      return fmtExp(cur)
    }

    if (args.length > 0) {
      const query = args.join(' ').toLowerCase()
      const match = data.find(e => e.company.toLowerCase().includes(query))
      if (!match) return [{ type: 'error' as const, content: `No experience found for '${args.join(' ')}'.` }]
      return fmtExp(match)
    }

    const lines: Omit<Line, 'id'>[] = [{ type: 'text' as const, content: '' }]
    for (const e of data) {
      lines.push(
        { type: 'text' as const, content: `  ${e.role} @ ${e.company}` },
        { type: 'text' as const, content: `  ${e.location}  •  ${e.period}` },
      )
      if (e.stack?.length) lines.push({ type: 'text' as const, content: `  Stack: ${e.stack.join(', ')}` })
      lines.push({ type: 'text' as const, content: '' })
    }
    return lines
  },
})

function fmtExp(e: import('../types').Experience): Omit<Line, 'id'>[] {
  const lines: Omit<Line, 'id'>[] = [
    { type: 'text' as const, content: '' },
    { type: 'text' as const, content: `  ${e.role} @ ${e.company}` },
    { type: 'text' as const, content: `  ${e.location}  •  ${e.period}` },
  ]
  if (e.stack?.length) lines.push({ type: 'text' as const, content: `  Stack: ${e.stack.join(', ')}` })
  if (e.highlights?.length) {
    lines.push({ type: 'text' as const, content: '' })
    for (const h of e.highlights) lines.push({ type: 'text' as const, content: `  › ${h}` })
  }
  lines.push({ type: 'text' as const, content: '' })
  return lines
}

register('experience', 'exp', {
  description: 'Alias for experience',
  usage: 'exp [--current | <company>]',
  async action(args, ctx) {
    return commands['experience']!.action(args, ctx)
  },
})

// ─── Education ────────────────────────────────────────────────

register('experience', 'education', {
  description: 'Degrees and coursework',
  usage: 'education',
  async action() {
    const data = await api.getEducation()
    if (!data) return [{ type: 'error' as const, content: 'Failed to fetch education.' }]
    const lines: Omit<Line, 'id'>[] = [{ type: 'text' as const, content: '' }]
    for (const e of data) {
      lines.push(
        { type: 'text' as const, content: `  ${e.degree}` },
        { type: 'text' as const, content: `  ${e.institution}, ${e.location}` },
        { type: 'text' as const, content: `  ${e.period || ''}  •  ${e.score}` },
        { type: 'text' as const, content: '' },
      )
    }
    return lines
  },
})

// ─── Achievements ─────────────────────────────────────────────

register('experience', 'achievements', {
  description: 'Hackathons and competition wins',
  usage: 'achievements',
  async action() {
    const data = await api.getAchievements()
    if (!data) return [{ type: 'error' as const, content: 'Failed to fetch achievements.' }]
    const lines: Omit<Line, 'id'>[] = [{ type: 'text' as const, content: '' }]
    for (const a of data) {
      lines.push(
        { type: 'text' as const, content: `  🏆 ${a.title}` },
        { type: 'text' as const, content: `     ${a.event} — ${a.date}` },
        { type: 'text' as const, content: `     ${a.description}` },
        { type: 'text' as const, content: '' },
      )
    }
    return lines
  },
})

// ─── Social & Links ───────────────────────────────────────────

register('social', 'links', {
  description: 'Lists all social links',
  usage: 'links',
  async action() {
    const s = await api.getSocials()
    const p = await api.getProfile()
    if (!s) return [{ type: 'error' as const, content: 'Failed to fetch socials.' }]
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: `  linkedin  ${s.linkedin || 'N/A (ask Krishna for URL)'}` },
      { type: 'text' as const, content: `  github    ${s.github || 'N/A'}` },
      { type: 'text' as const, content: `  email     ${s.email}` },
      { type: 'text' as const, content: `  phone     ${p?.phone || ''}` },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('social', 'github', {
  description: 'Opens GitHub profile in a new tab',
  usage: 'github',
  async action() {
    const s = await api.getSocials()
    const url = s?.github || 'https://github.com/'
    openUrl(url)
    return [{ type: 'success' as const, content: `  Opening ${url}` }]
  },
})

register('social', 'linkedin', {
  description: 'Opens LinkedIn profile in a new tab',
  usage: 'linkedin',
  async action() {
    const s = await api.getSocials()
    const url = s?.linkedin || 'https://linkedin.com/'
    openUrl(url)
    return [{ type: 'success' as const, content: `  Opening ${url}` }]
  },
})

register('social', 'resume', {
  description: 'Opens the resume PDF in a new tab',
  usage: 'resume',
  async action() {
    const resp = await fetch('/api/resume')
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    return [{ type: 'success' as const, content: '  Opening resume PDF...' }]
  },
})

register('social', 'email', {
  description: 'Opens Gmail compose with pre-filled portfolio inquiry',
  usage: 'email',
  async action() {
    const p = await api.getProfile()
    const addr = p?.email || 'krishnapathak8595@gmail.com'
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(addr)}&su=${encodeURIComponent('Portfolio Inquiry')}&body=${encodeURIComponent('Hi Krishna,\n\nI found your portfolio and would like to connect.')}`

    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: '  Opening Gmail compose...' },
      { type: 'link' as const, content: { href: gmailUrl, label: `  ${addr}` } },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('social', 'phone', {
  description: 'Prints phone number',
  usage: 'phone',
  async action() {
    const p = await api.getProfile()
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: `  ${p?.phone || '9028448595'}` },
      { type: 'text' as const, content: '' },
    ]
  },
})

// ─── Contact ──────────────────────────────────────────────────

register('connect', 'connect', {
  description: 'Shows LinkedIn and Email to connect',
  usage: 'connect',
  async action() {
    const s = await api.getSocials()
    const p = await api.getProfile()
    const linkedinUrl = s?.linkedin || 'https://linkedin.com/in/'
    const emailAddr = s?.email || p?.email || 'krishnapathak8595@gmail.com'
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailAddr)}&su=${encodeURIComponent('Portfolio Inquiry')}&body=${encodeURIComponent('Hi Krishna,\n\nI found your portfolio and would like to connect.')}`

    return [
      { type: 'text' as const, content: '' },
      { type: 'link' as const, content: { href: linkedinUrl, prefix: '  LinkedIn  ', label: linkedinUrl } },
      { type: 'text' as const, content: '' },
      { type: 'link' as const, content: { href: gmailUrl, prefix: '  Email     ', label: emailAddr } },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('contact', 'contact', {
  description: 'Shows contact information',
  usage: 'contact',
  async action() {
    const s = await api.getSocials()
    const p = await api.getProfile()
    return [
      { type: 'text' as const, content: '' },
      { type: 'link' as const, content: { href: s?.linkedin || 'https://linkedin.com/', prefix: '  linkedin  ', label: s?.linkedin || 'https://linkedin.com/' } },
      { type: 'link' as const, content: { href: s?.github || 'https://github.com/', prefix: '  github    ', label: s?.github || 'https://github.com/' } },
      { type: 'text' as const, content: `  email     ${s?.email || p?.email || ''}` },
      { type: 'text' as const, content: `  phone     ${p?.phone || ''}` },
      { type: 'text' as const, content: '' },
    ]
  },
})

// ─── Ask (AI) ─────────────────────────────────────────────────

register('core', 'ask', {
  description: 'Ask a question about Krishna\'s background (AI-powered)',
  usage: 'ask <question>',
  helpText: [
    'Ask natural-language questions about skills, experience, projects, etc.',
    'Example: ask "does he have experience with Docker?"',
    'Answers are grounded in actual portfolio data.',
  ],
  async action(args) {
    if (args.length === 0) return [{ type: 'error' as const, content: 'Usage: ask <question>' }]

    ctxAddLine({ type: 'system' as const, content: '  Thinking...' })

    const question = args.join(' ')
    const result = await api.postAsk(question)

    if (result.error) return [{ type: 'error' as const, content: result.error }]
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: `  ${result.answer}` },
      { type: 'text' as const, content: '' },
    ]
  },
})

// This is a hack - we need a mutable reference to addLine for the ask command
let ctxAddLine: (line: Omit<Line, 'id'>) => void = () => {}
export function setCtxAddLine(fn: typeof ctxAddLine) { ctxAddLine = fn }

// ─── Fun / Easter Eggs ────────────────────────────────────────

register('fun', 'sudo', {
  description: '👑 (easter egg)',
  usage: 'sudo <command>',
  async action(args) {
    if (args.length === 0) return [{ type: 'error' as const, content: 'usage: sudo <command>' }]
    const cmd = args.join(' ')
    if (cmd === 'rm -rf /' || cmd === 'rm -rf /*') {
      return [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: '  Whoa there! This is a portfolio site, not a real system.' },
        { type: 'text' as const, content: `  Party's over. Nice try. 😄` },
        { type: 'text' as const, content: '' },
      ]
    }
    if (args[0] === 'apt' || args[0] === 'pacman' || args[0] === 'brew') {
      return [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: '  [sudo] password for krishna: ' },
        { type: 'text' as const, content: '  Sorry, try again.' },
        { type: 'text' as const, content: '  [sudo] password for krishna: ' },
        { type: 'text' as const, content: '  sudo: 3 incorrect password attempts' },
        { type: 'text' as const, content: '  This incident will be reported. (Not really.)' },
        { type: 'text' as const, content: '' },
      ]
    }
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: '  Permission denied. Nice try 😉' },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('fun', 'vim', {
  description: 'You opened vim. Good luck getting out.',
  usage: 'vim',
  async action() {
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: '  ╔══════════════════════════════════╗' },
      { type: 'text' as const, content: '  ║                                  ║' },
      { type: 'text' as const, content: '  ║   You opened vim.                ║' },
      { type: 'text' as const, content: '  ║   Good luck getting out.         ║' },
      { type: 'text' as const, content: '  ║                                  ║' },
      { type: 'text' as const, content: '  ║   :q to quit... oh wait.         ║' },
      { type: 'text' as const, content: `  ║   This isn't real vim!           ║` },
      { type: 'text' as const, content: '  ║                                  ║' },
      { type: 'text' as const, content: '  ║   Just kidding. Type anything.   ║' },
      { type: 'text' as const, content: '  ║                                  ║' },
      { type: 'text' as const, content: '  ╚══════════════════════════════════╝' },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('fun', 'exit', {
  description: 'Prints a goodbye message',
  usage: 'exit',
  async action(_args, ctx) {
    ctx.addLine({ type: 'system' as const, content: '' })
    ctx.addLine({ type: 'system' as const, content: `  This isn't a real shell — closing tabs is up to your browser 🙂 Try Ctrl+W.` })
    ctx.addLine({ type: 'system' as const, content: '' })
    ctx.addLine({ type: 'fade' as const })
    await sleep(1500)
    ctx.clear()
    ctx.addLine({ type: 'banner' as const })
    return []
  },
})

register('fun', 'hack', {
  description: 'Fake matrix-style character rain for 3 seconds',
  usage: 'hack',
  async action(_args, ctx) {
    const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
    const chars = katakana + '0123456789ABCDEF<>/{}[]|&^%$#@!'

    ctx.addLine({ type: 'system' as const, content: '  Initializing hack sequence...' })
    await sleep(200)
    ctx.addLine({ type: 'system' as const, content: '  Bypassing firewall...' })
    await sleep(250)
    ctx.addLine({ type: 'system' as const, content: '  Injecting payload...' })
    await sleep(200)
    ctx.addLine({ type: 'system' as const, content: '' })

    for (let i = 0; i < 18; i++) {
      let line = ''
      for (let j = 0; j < 55; j++) {
        line += chars[Math.floor(Math.random() * chars.length)]
      }
      ctx.addLine({ type: 'matrix' as const, content: line })
      await sleep(70)
    }

    ctx.addLine({ type: 'system' as const, content: '' })
    ctx.addLine({ type: 'success' as const, content: '  ACCESS GRANTED. Just kidding, this is a portfolio site.' })
    return []
  },
})

register('fun', 'coffee', {
  description: 'Renders an ASCII art coffee cup',
  usage: 'coffee',
  async action() {
    return [
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: '     (  )   (' },
      { type: 'text' as const, content: '      ) (   )' },
      { type: 'text' as const, content: '    (_)  )  (' },
      { type: 'text' as const, content: '      (_)_)' },
      { type: 'text' as const, content: '       __|__' },
      { type: 'text' as const, content: '    //\\\\|//\\\\' },
      { type: 'text' as const, content: '    |||   |||' },
      { type: 'text' as const, content: '    |||   |||' },
      { type: 'text' as const, content: '    |||   |||' },
      { type: 'text' as const, content: '   /_|||_\\\\_||_\\\\' },
      { type: 'text' as const, content: '' },
      { type: 'text' as const, content: '  Here ☕ — fuel for more code!' },
      { type: 'text' as const, content: '' },
    ]
  },
})

register('fun', 'theme', {
  description: 'Switch color theme',
  usage: 'theme [dark | light | matrix | --toggle]',
  helpText: [
    'Available themes: dark (default), light, matrix',
    '--toggle  Switch between dark and light',
  ],
  async action(args, ctx) {
    if (args.includes('--toggle')) {
      const cur = ctx.getTheme()
      const next = cur === 'light' ? 'dark' : 'light'
      ctx.setTheme(next)
      return [{ type: 'success' as const, content: `Toggled theme to '${next}'` }]
    }
    if (args.length === 0) {
      return [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: `  Current theme: ${ctx.getTheme()}` },
        { type: 'text' as const, content: '  Available: dark, light, matrix' },
        { type: 'text' as const, content: '  Usage: theme [name | --toggle]' },
        { type: 'text' as const, content: '' },
      ]
    }
    const valid = ['dark', 'light', 'matrix']
    const t = valid.find(v => v === args[0])
    if (!t) return [{ type: 'error' as const, content: `Unknown theme '${args[0]}'. Available: dark, light, matrix` }]
    ctx.setTheme(t)
    return [{ type: 'success' as const, content: `Theme changed to '${t}'` }]
  },
})

register('core', 'cd', {
  description: 'Change directory (simulated)',
  usage: 'cd <dir>',
  async action() {
    return [{ type: 'error' as const, content: `cd: No such directory. Try 'ls' to see available sections.` }]
  },
})

register('core', 'curl', {
  description: 'Fetch data from the portfolio API',
  usage: 'curl /api/<endpoint>',
  async action(args) {
    if (args.length === 0) return [{ type: 'error' as const, content: 'Usage: curl /api/<endpoint>' }]
    const url = args[0].startsWith('/') ? args[0] : `/${args[0]}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      return [
        { type: 'text' as const, content: '' },
        { type: 'text' as const, content: JSON.stringify(data, null, 2) },
        { type: 'text' as const, content: '' },
      ]
    } catch {
      return [{ type: 'error' as const, content: `curl: failed to fetch ${url}` }]
    }
  },
})

export { commands, categories }
