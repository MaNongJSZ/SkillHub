import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useAppStore } from '../../stores/useAppStore'
import { useThemeStore } from '../../stores/useThemeStore'
import { useToastStore } from '../../stores/useToastStore'
import CommandPalette from '../ui/CommandPalette'
import SearchBar from '../search/SearchBar'
import AgentBar from './AgentBar'
import InstallDialog from '../install/InstallDialog'
import Toast from '../ui/Toast'

interface MainLayoutProps {
  children: ReactNode
  sidebar: ReactNode
}

export default function MainLayout({ children, sidebar }: MainLayoutProps) {
  const {
    sidebarOpen,
    setSidebarOpen,
    view,
    setView,
    searchResults,
    selectSkill,
    installDialogOpen,
    setInstallDialogOpen,
    installFromPath,
  } = useAppStore()
  const { theme, setTheme } = useThemeStore()
  const { pushToast } = useToastStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)

  const commandResults = useMemo(
    () =>
      searchResults.map((result, index) => ({
        id: `${result.skill_name}-${result.matched_field}-${index}`,
        title: result.skill_name,
        subtitle: `${result.matched_field} · ${result.matched_text}`,
      })),
    [searchResults]
  )

  useKeyboard({
    'ctrl+k': () => setCommandPaletteOpen(true),
    'ctrl+b': () => setSidebarOpen(!sidebarOpen),
    'ctrl+i': () => setInstallDialogOpen(true),
  })

  // 拖拽安装：使用 Tauri 2 事件
  useEffect(() => {
    const unlisten = listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
      const paths = event.payload.paths
      if (!paths?.length) {
        pushToast({ type: 'info', message: '请拖拽包含 SKILL.md 的文件夹' })
        return
      }

      try {
        await installFromPath(paths[0])
        pushToast({ type: 'success', message: '安装成功' })
      } catch {
        pushToast({ type: 'error', message: '安装失败，请检查路径后重试' })
      }
    })

    // 阻止浏览器默认的文件打开行为
    const prevent = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)

    return () => {
      void unlisten.then((fn) => fn())
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [installFromPath, pushToast])

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h7v7H3V3zm11 0h7v4h-7V3zM3 14h7v7H3v-7zm11-3h7v10h-7V11z"
          />
        </svg>
      ),
    },
    {
      id: 'list' as const,
      label: 'Skills',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      id: 'agents' as const,
      label: 'Agents',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ]

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 侧栏 */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } flex flex-col border-r border-[color:var(--text-secondary)] bg-[var(--bg-secondary)] transition-all duration-300 overflow-hidden`}
      >
        <div className="flex w-64 flex-col h-full">
          {/* 侧栏头部 */}
          <div className="flex h-14 items-center justify-between border-b border-[color:var(--text-secondary)] px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                SkillHub
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]"
              title="收起侧栏"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          {/* 导航 */}
          <nav className="grid grid-cols-1 gap-1 border-b border-[color:var(--text-secondary)] px-3 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'list') {
                    setView('list')
                  } else {
                    setView(item.id)
                  }
                }}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  view === item.id ||
                  (view === 'detail' && item.id === 'list') ||
                  (view === 'search' && item.id === 'list')
                    ? 'bg-blue-600/20 text-blue-500'
                    : 'text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* 侧栏内容 */}
          <div className="flex-1 overflow-hidden">{sidebar}</div>
        </div>
      </aside>

      {/* 主区域 */}
      <main ref={mainRef} className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center gap-3 border-b border-[color:var(--text-secondary)] bg-[var(--bg-secondary)] px-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]"
              title="展开侧栏"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}

          <div className="flex-1">
            <SearchBar />
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]"
            title={`切换主题（当前：${theme === 'light' ? '亮色' : theme === 'dark' ? '暗色' : '系统'}）`}
          >
            {theme === 'light' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 16a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            ) : theme === 'dark' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M4 13h16M5 17h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.5a3 3 0 11-3-3" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setInstallDialogOpen(true)}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-black/10"
            title="安装 Skill（Ctrl+I）"
          >
            安装
          </button>

          <button
            onClick={() => setView('settings')}
            className={`rounded-md p-2 transition-colors ${
              view === 'settings'
                ? 'bg-blue-600/20 text-blue-500'
                : 'text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]'
            }`}
            title="设置"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </header>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto bg-[var(--bg-primary)]">{children}</div>

        {/* 底部 Agent 栏 */}
        <AgentBar />

        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          results={commandResults}
          onSelect={(result) => {
            void selectSkill(result.title)
          }}
        />

        <InstallDialog
          open={installDialogOpen}
          onClose={() => setInstallDialogOpen(false)}
          onInstallPath={installFromPath}
        />

        <Toast />
      </main>
    </div>
  )
}
