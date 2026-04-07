import { render, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { it, expect } from 'vitest'
import { useKeyboard } from './useKeyboard'

function Demo() {
  const [open, setOpen] = useState(false)

  useKeyboard({
    'ctrl+k': () => setOpen(true),
  })

  return <div>{open ? 'OPEN' : 'CLOSED'}</div>
}

it('opens when pressing ctrl+k', () => {
  render(<Demo />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(screen.queryByText('OPEN')).not.toBeNull()
})
