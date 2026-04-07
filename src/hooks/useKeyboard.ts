import { useEffect, useRef } from 'react'

type KeyboardBindings = Record<string, () => void>

function normalizeEventKey(event: KeyboardEvent) {
  const parts: string[] = []

  if (event.ctrlKey || event.metaKey) {
    parts.push('ctrl')
  }
  if (event.altKey) {
    parts.push('alt')
  }
  if (event.shiftKey) {
    parts.push('shift')
  }

  parts.push(event.key.toLowerCase())
  return parts.join('+')
}

export function useKeyboard(bindings: KeyboardBindings) {
  const bindingsRef = useRef(bindings)

  useEffect(() => {
    bindingsRef.current = bindings
  }, [bindings])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = normalizeEventKey(event)
      const handler = bindingsRef.current[key]

      if (!handler) {
        return
      }

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
