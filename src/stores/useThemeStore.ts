import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  theme: ThemeMode
  resolved: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  initTheme: () => void
}

const KEY = 'skillhub-theme'

function resolveSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolved: 'light',
  setTheme: (theme) => {
    const resolved = theme === 'system' ? resolveSystemTheme() : theme
    localStorage.setItem(KEY, theme)
    applyTheme(resolved)
    set({ theme, resolved })
  },
  initTheme: () => {
    const saved = (localStorage.getItem(KEY) as ThemeMode | null) ?? 'system'
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const onSystemThemeChanged = () => {
      if (get().theme === 'system') {
        get().setTheme('system')
      }
    }

    media.addEventListener('change', onSystemThemeChanged)
    get().setTheme(saved)
  },
}))
