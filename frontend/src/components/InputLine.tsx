import { useState, useEffect } from 'react'

interface Props {
  input: string
  setInput: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  promptPrefix: string
}

export default function InputLine({ input, setInput, onKeyDown, inputRef, promptPrefix }: Props) {
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setShowCursor(p => !p), 530)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="terminal-input-line">
      <span className="terminal-prompt">{promptPrefix}</span>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        className="terminal-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="Terminal input"
      />
      <span
        className="terminal-input-blink"
        style={{ visibility: showCursor ? 'visible' : 'hidden' }}
      >
        ▊
      </span>
    </div>
  )
}
