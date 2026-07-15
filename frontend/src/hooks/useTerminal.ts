import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { Line, FormMode, FormField, CommandContext } from '../types'
import { commands, fuzzyFind, setCtxAddLine } from '../commands/registry'

function genId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface State {
  lines: Line[]
  history: string[]
  historyIndex: number
  input: string
  theme: string
  crt: boolean
  formMode: FormMode | null
}

const initialState: State = {
  lines: [],
  history: [],
  historyIndex: -1,
  input: '',
  theme: localStorage.getItem('terminal-theme') || 'dark',
  crt: localStorage.getItem('terminal-crt') === 'true',
  formMode: null,
}

type Action =
  | { type: 'ADD_LINE'; line: Omit<Line, 'id'> }
  | { type: 'ADD_LINES'; lines: Omit<Line, 'id'>[] }
  | { type: 'CLEAR' }
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SET_HISTORY_INDEX'; index: number }
  | { type: 'PUSH_HISTORY'; command: string }
  | { type: 'SET_THEME'; theme: string }
  | { type: 'TOGGLE_CRT' }
  | { type: 'ENTER_FORM_MODE'; fields: FormField[] }
  | { type: 'ADVANCE_FORM'; key: string; value: string }
  | { type: 'EXIT_FORM_MODE' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_LINE':
      return { ...state, lines: [...state.lines, { ...action.line, id: genId() }] }
    case 'ADD_LINES':
      return { ...state, lines: [...state.lines, ...action.lines.map(l => ({ ...l, id: genId() }))] }
    case 'CLEAR':
      return { ...state, lines: [] }
    case 'SET_INPUT':
      return { ...state, input: action.input }
    case 'SET_HISTORY_INDEX':
      return { ...state, historyIndex: action.index }
    case 'PUSH_HISTORY':
      return { ...state, history: [...state.history, action.command], historyIndex: -1 }
    case 'SET_THEME':
      localStorage.setItem('terminal-theme', action.theme)
      return { ...state, theme: action.theme }
    case 'TOGGLE_CRT':
      localStorage.setItem('terminal-crt', String(!state.crt))
      return { ...state, crt: !state.crt }
    case 'ENTER_FORM_MODE':
      return { ...state, formMode: { active: true, fields: action.fields, step: 0, data: {} } }
    case 'ADVANCE_FORM': {
      if (!state.formMode) return state
      const data = { ...state.formMode.data, [action.key]: action.value }
      return { ...state, formMode: { ...state.formMode, data, step: state.formMode.step + 1 } }
    }
    case 'EXIT_FORM_MODE':
      return { ...state, formMode: null }
    default:
      return state
  }
}

const HELP_FLAGS = ['--help', '-h']

export default function useTerminal() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const bannerAdded = useRef(false)

  useEffect(() => {
    if (bannerAdded.current) return
    bannerAdded.current = true
    dispatch({ type: 'ADD_LINE', line: { type: 'banner' } })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.lines])

  const focusInput = useCallback(() => inputRef.current?.focus(), [])
  useEffect(() => { focusInput() }, [focusInput])

  const addLine = useCallback((line: Omit<Line, 'id'>) => {
    dispatch({ type: 'ADD_LINE', line })
  }, [])

  const addLines = useCallback((lines: Omit<Line, 'id'>[]) => {
    if (lines.length > 0) dispatch({ type: 'ADD_LINES', lines })
  }, [])

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const setTheme = useCallback((t: string) => dispatch({ type: 'SET_THEME', theme: t }), [])
  const getTheme = useCallback(() => state.theme, [state.theme])
  const getHistory = useCallback(() => state.history, [state.history])

  const openUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const enterFormMode = useCallback(() => {
    dispatch({
      type: 'ENTER_FORM_MODE',
      fields: [
        { key: 'name', label: 'Name', prompt: 'name > ' },
        { key: 'email', label: 'Email', prompt: 'email > ' },
        { key: 'message', label: 'Message', prompt: 'message > ' },
      ],
    })
  }, [])

  const exitFormMode = useCallback(() => {
    dispatch({ type: 'EXIT_FORM_MODE' })
  }, [])

  const buildCtx = useCallback((_addLine: typeof addLine, _addLines: typeof addLines): CommandContext => ({
    addLine: _addLine,
    addLines: _addLines,
    clear,
    setTheme,
    getTheme,
    getHistory,
    enterFormMode,
    exitFormMode,
    openUrl,
  }), [clear, setTheme, getTheme, getHistory, enterFormMode, exitFormMode, openUrl])

  const executeCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim()
    addLine({ type: 'command', content: `guest@krishna:~$ ${cmd}` })
    if (!trimmed) return

    dispatch({ type: 'PUSH_HISTORY', command: trimmed })

    const parts = trimmed.split(/\s+/)
    const cmdName = parts[0].toLowerCase()
    const args = parts.slice(1)
    let cmdDef = commands[cmdName]

    if (!cmdDef) {
      const suggestion = fuzzyFind(cmdName, commands)
      const msg = suggestion
        ? `command not found: ${cmdName}. Did you mean '${suggestion}'?`
        : `command not found: ${cmdName}. Type 'help' to see available commands.`
      addLine({ type: 'error', content: msg })
      return
    }

    if (!cmdDef.skipHelpCheck && args.some(a => HELP_FLAGS.includes(a))) {
      addLines([
        { type: 'text', content: '' },
        { type: 'text', content: `  Usage: ${cmdDef.usage}` },
        { type: 'text', content: `  ${cmdDef.description}` },
        ...(cmdDef.helpText || []).map(l => ({ type: 'text' as const, content: `  ${l}` })),
        { type: 'text', content: '' },
      ])
      return
    }

    try {
      const result = await cmdDef.action(args, buildCtx(addLine, addLines))
      if (result && result.length > 0) addLines(result)
    } catch (err) {
      addLine({ type: 'error', content: `Error: ${(err as Error).message}` })
    }
  }, [addLine, addLines, clear, setTheme, getTheme, getHistory, enterFormMode, exitFormMode, openUrl, buildCtx])

  useEffect(() => {
    setCtxAddLine(addLine)
  }, [addLine])

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      if (state.formMode?.active) {
        dispatch({ type: 'EXIT_FORM_MODE' })
        addLine({ type: 'system', content: '^C' })
        addLine({ type: 'system', content: 'Contact form cancelled.' })
      } else {
        addLine({ type: 'system', content: '^C' })
      }
      dispatch({ type: 'SET_INPUT', input: '' })
      dispatch({ type: 'SET_HISTORY_INDEX', index: -1 })
      return
    }

    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      dispatch({ type: 'CLEAR' })
      return
    }

    if (state.formMode?.active && e.key === 'Enter') {
      e.preventDefault()
      const input = state.input.trim()

      if (input.toLowerCase() === '--cancel') {
        dispatch({ type: 'EXIT_FORM_MODE' })
        addLine({ type: 'command', content: `  ${state.input}` })
        addLine({ type: 'system', content: 'Contact form cancelled.' })
        dispatch({ type: 'SET_INPUT', input: '' })
        return
      }

      addLine({ type: 'command', content: `  ${input}` })
      const field = state.formMode.fields[state.formMode.step]
      dispatch({ type: 'ADVANCE_FORM', key: field.key, value: input })
      dispatch({ type: 'SET_INPUT', input: '' })

      if (state.formMode.step + 1 >= state.formMode.fields.length) {
        dispatch({ type: 'EXIT_FORM_MODE' })
        addLine({ type: 'system', content: 'Message logged. Use the email command to reach out directly.' })
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (state.formMode?.active) return
      const { history, historyIndex } = state
      if (history.length === 0) return
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
      dispatch({ type: 'SET_HISTORY_INDEX', index: newIndex })
      dispatch({ type: 'SET_INPUT', input: history[newIndex] })
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (state.formMode?.active) return
      const { history, historyIndex } = state
      if (historyIndex === -1) return
      const newIndex = historyIndex + 1
      if (newIndex >= history.length) {
        dispatch({ type: 'SET_HISTORY_INDEX', index: -1 })
        dispatch({ type: 'SET_INPUT', input: '' })
      } else {
        dispatch({ type: 'SET_HISTORY_INDEX', index: newIndex })
        dispatch({ type: 'SET_INPUT', input: history[newIndex] })
      }
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const names = Object.keys(commands)
      const partial = state.input.trim().toLowerCase()
      if (!partial) return
      const matches = names.filter(n => n.startsWith(partial))
      if (matches.length === 1) {
        dispatch({ type: 'SET_INPUT', input: matches[0] })
      } else if (matches.length > 1) {
        addLine({ type: 'system', content: matches.join('  ') })
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      await executeCommand(state.input)
      dispatch({ type: 'SET_INPUT', input: '' })
      return
    }
  }, [state, addLine, addLines, executeCommand])

  const handleTerminalClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const formMode = state.formMode
  const currentField = formMode?.active ? formMode.fields[formMode.step] : null
  const promptPrefix = currentField ? currentField.prompt : 'guest@krishna:~$ '

  return {
    lines: state.lines,
    input: state.input,
    setInput: useCallback((val: string) => dispatch({ type: 'SET_INPUT', input: val }), []),
    handleKeyDown,
    handleTerminalClick,
    inputRef,
    outputRef,
    bottomRef,
    theme: state.theme,
    crt: state.crt,
    formMode: formMode?.active || false,
    promptPrefix,
  }
}
