import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it, expect, vi } from 'vitest'
import InstallDialog from './InstallDialog'

it('submits path install', async () => {
  const onInstall = vi.fn().mockResolvedValue(undefined)

  render(<InstallDialog open onClose={vi.fn()} onInstallPath={onInstall} />)

  await userEvent.type(screen.getByPlaceholderText('输入本地路径'), 'C:/skills/weather')
  await userEvent.click(screen.getByRole('button', { name: '安装' }))

  expect(onInstall).toHaveBeenCalledWith('C:/skills/weather')
})
