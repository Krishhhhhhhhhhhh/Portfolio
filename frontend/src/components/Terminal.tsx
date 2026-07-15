import useTerminal from '../hooks/useTerminal'
import OutputLine from './OutputLine'
import InputLine from './InputLine'

export default function Terminal() {
  const {
    lines,
    input,
    setInput,
    handleKeyDown,
    handleTerminalClick,
    inputRef,
    outputRef,
    bottomRef,
    theme,
    crt,
    formMode,
    promptPrefix,
  } = useTerminal()

  return (
    <div
      className="terminal"
      data-theme={theme}
      data-crt={crt}
      onClick={handleTerminalClick}
    >
      {crt && <div className="terminal-scanline" />}
      {crt && <div className="terminal-crt-curve" />}

      {formMode && (
        <div className="form-mode-hint">
          Contact form — type values and press Enter. Type --cancel to exit.
        </div>
      )}

      <div className="terminal-output" ref={outputRef}>
        {lines.map(line => (
          <OutputLine key={line.id} line={line} />
        ))}
        <div ref={bottomRef} />
      </div>

      <InputLine
        input={input}
        setInput={setInput}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        promptPrefix={promptPrefix}
      />
    </div>
  )
}
