import type { Line, LinkContent } from '../types'

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ██╗  ██╗██████╗ ██╗███████╗██╗  ██╗███╗   ██╗ █████╗    ║
║    ██║ ██╔╝██╔══██╗██║██╔════╝██║  ██║████╗  ██║██╔══██╗   ║
║    █████╔╝ ██████╔╝██║███████╗███████║██╔██╗ ██║███████║   ║
║    ██╔═██╗ ██╔══██╗██║╚════██║██╔══██║██║╚██╗██║██╔══██║   ║
║    ██║  ██╗██║  ██║██║███████║██║  ██║██║ ╚████║██║  ██║   ║
║    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝   ║
║                                                              ║
║              Full Stack Developer (MERN)                      ║
║                                                              ║
║     Type 'help' to get started, or 'about' to learn more.    ║
╚══════════════════════════════════════════════════════════════╝
`

export default function OutputLine({ line }: { line: Line }) {
  const { type, content } = line

  if (type === 'banner') {
    return (
      <div className="banner">
        <pre className="banner-text">{BANNER}</pre>
      </div>
    )
  }

  if (type === 'command') {
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return <div className="line line-command">&nbsp;</div>
    }
    return <div className="line line-command">{String(content)}</div>
  }

  if (type === 'error') return <div className="line line-error">{String(content)}</div>
  if (type === 'success') return <div className="line line-success">{String(content)}</div>
  if (type === 'system') return <div className="line line-system">{String(content)}</div>

  if (type === 'image' && content && typeof content === 'object' && 'src' in content) {
    const c = content as { src: string; alt: string }
    return (
      <div className="line">
        <div className="image-frame">
          <img
            src={c.src}
            alt={c.alt || 'Profile photo'}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
              const fb = (e.target as HTMLImageElement).parentElement?.querySelector('.image-fallback')
              if (fb) (fb as HTMLElement).style.display = 'block'
            }}
          />
          <span className="image-fallback" style={{ display: 'none' }}>[{c.alt || 'Image'}]</span>
        </div>
      </div>
    )
  }

  if (type === 'link' && content && typeof content === 'object' && 'href' in content) {
    const c = content as LinkContent
    return (
      <div className="line line-link-container">
        {c.prefix && <span className="line-link-prefix">{c.prefix}</span>}
        <a href={c.href} className="line-link">{c.label}</a>
      </div>
    )
  }

  if (type === 'matrix') return <div className="line line-matrix">{String(content)}</div>
  if (type === 'fade') return <div className="line line-fade" />

  if (!content || (typeof content === 'string' && content.trim() === '')) {
    return <div className="line line-empty">&nbsp;</div>
  }

  return <div className="line line-text">{String(content)}</div>
}
