# SkillForge UX 增强 + 主题切换 设计文档

**日期**: 2026-04-06
**状态**: 已批准
**方案**: A — 渐进增强

---

## 1. 背景与目标

SkillForge P0 已完成基础 CRUD 功能，但作为高频 agent 使用者，日常操作效率不足。本设计从四大场景出发，全面提升用户体验：

1. **快速开关 Skills** — 批量启用/禁用到多个 Agent
2. **搜索和发现** — 全局快捷键搜索，实时过滤高亮
3. **安装和卸载** — 拖拽安装 + 快速卸载 + 操作反馈
4. **总览和监控** — Dashboard 矩阵视图，一目了然
5. **暗黑/明亮主题** — 三态切换（亮/暗/系统）

---

## 2. 主题系统

### 架构

```
useThemeStore (Zustand)
  ├── theme: 'light' | 'dark' | 'system'
  ├── resolved: 'light' | 'dark'      ← 实际生效值
  ├── setTheme(theme)                  ← 设置并持久化
  └── init()                           ← 读 localStorage + 监听系统偏好
```

### 实现要点

- **CSS 变量**：`index.css` 定义 `:root`（亮色）和 `.dark`（暗色）两套变量，所有组件从变量取色
- **Tailwind 联动**：`<html>` 上切换 `class="dark"`，利用 Tailwind `dark:` 前缀
- **系统监听**：`window.matchMedia('(prefers-color-scheme: dark)')` 实时响应
- **持久化**：`localStorage` 存储 `skillforge-theme`
- **快捷切换**：Header 右侧图标按钮（太阳/月亮/电脑），三态循环
- **设置页配置**：Settings 外观卡片内放主题三态选择

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/stores/useThemeStore.ts` | 新增 |
| `src/index.css` | 修改 — 增加 CSS 变量 + `.dark` 套 |
| `src/main.tsx` | 修改 — 初始化主题 |
| `src/components/layout/MainLayout.tsx` | 修改 — Header 加主题切换按钮 |
| `src/components/settings/Settings.tsx` | 修改 — 外观设置区 |

---

## 3. 总览仪表盘（Dashboard）

### 布局

```
┌─────────────────────────────────────────────────┐
│  📦 12 Skills    🤖 4 Agents    ✅ 8 已启用      │
├─────────────────────────────────────────────────┤
│ Agent × Skill 矩阵                              │
│            │ Claude │ Cursor │ Kiro │ Codex      │
│ ──────────────────────────────────────────────── │
│ ☐ code-review│  ✅    │  ✅    │  ○   │  ✅      │
│ ☐ git-flow   │  ✅    │  ○     │  ✅  │  ○       │
│ ☐ weather    │  ○     │  ○     │  ○   │  ○       │
│                                                  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│ [2 项已选中]  [启用到选中 Agents ▾]  [从选中 Agents 禁用] │
└─────────────────────────────────────────────────┘
```

### 交互

- 统计卡片：总 Skills、总 Agents、已启用链接数
- 矩阵单元格可点击切换启用/禁用（调用 `enable_skill` / `disable_skill`）
- 行首 checkbox 多选，选中后底部浮出批量操作栏
- 列头 checkbox 可选中该 Agent 下的所有 Skill
- 作为默认首页（`view: 'dashboard'`），替代原空状态

### 数据流

- Dashboard 加载时并行调用 `list_skills` + `detect_agents`
- 遍历每个 Skill 对每个 Agent 检查 `get_skill_links` 状态
- 批量操作调用 `batch_enable` / 循环调用 `disable_skill`

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/components/dashboard/Dashboard.tsx` | 新增 |
| `src/components/dashboard/StatsCards.tsx` | 新增 |
| `src/components/dashboard/MatrixGrid.tsx` | 新增 |
| `src/stores/useAppStore.ts` | 修改 — 增加 dashboard view + batch actions |
| `src/App.tsx` | 修改 — dashboard 作为默认 view |

---

## 4. 搜索增强 + 快速安装

### 全局搜索 `Ctrl+K`

- 弹出 Command Palette 风格浮层（居中，半透明遮罩）
- 实时过滤本地 Skills + 内容搜索
- 搜索结果高亮匹配文本
- `↑↓` 导航，`Enter` 选中，`Esc` 关闭

### 快速安装

- Header 右侧 `+` 按钮，点击弹出安装面板
- 支持输入本地路径或拖拽文件夹
- 安装成功后 Toast 通知 + 自动刷新列表

### 拖拽安装

- `MainLayout` 监听全局 `dragover` / `drop` 事件
- 拖入文件时显示拖拽提示浮层
- 释放后调用 `install_skill_from_path`

### Toast 通知

- 固定底部居中，3 秒自动消失
- 类型：`success`（绿）/ `error`（红）/ `info`（蓝）
- 支持堆叠（多个 toast 从下往上推）

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 打开全局搜索 |
| `Ctrl+B` | 切换侧栏 |
| `Escape` | 关闭弹窗/搜索 |
| `1` / `2` / `3` | 侧栏内切换导航（Skills/Agents/Dashboard） |

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/components/ui/CommandPalette.tsx` | 新增 |
| `src/components/ui/Toast.tsx` | 新增 |
| `src/components/install/InstallDialog.tsx` | 新增 |
| `src/hooks/useKeyboard.ts` | 新增 |
| `src/stores/useToastStore.ts` | 新增 |
| `src/components/layout/MainLayout.tsx` | 修改 — 拖拽监听 + 安装按钮 |
| `src/stores/useAppStore.ts` | 修改 — 安装 action |

---

## 5. Settings 重构

### 布局

卡片式分组，每个卡片一个主题：

1. **外观**：主题三态选择（图标卡片）+ 侧栏默认状态
2. **API Keys**：AgentSkills.io Key 输入框
3. **路径**：仓库路径 + 缓存路径（只读展示）
4. **编辑器**：外部编辑器路径
5. **高级**：自动检测 Agents 开关

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/components/settings/Settings.tsx` | 修改 — 重构为卡片布局 |

---

## 6. 文件变动总览

### 新增文件（8 个）

| 文件 | 职责 |
|------|------|
| `src/stores/useThemeStore.ts` | 主题状态管理 |
| `src/stores/useToastStore.ts` | Toast 通知状态 |
| `src/components/dashboard/Dashboard.tsx` | 仪表盘主组件 |
| `src/components/dashboard/StatsCards.tsx` | 统计卡片 |
| `src/components/dashboard/MatrixGrid.tsx` | Agent×Skill 矩阵 |
| `src/components/ui/CommandPalette.tsx` | 全局搜索弹窗 |
| `src/components/ui/Toast.tsx` | Toast 通知组件 |
| `src/components/install/InstallDialog.tsx` | 安装对话框 |
| `src/hooks/useKeyboard.ts` | 快捷键注册 |

### 修改文件（7 个）

| 文件 | 改动 |
|------|------|
| `src/index.css` | CSS 变量 + 暗色主题套 |
| `src/main.tsx` | 初始化主题 |
| `src/App.tsx` | Dashboard 作为默认 view |
| `src/stores/useAppStore.ts` | 新增 dashboard view + batch actions + 安装 action |
| `src/components/layout/MainLayout.tsx` | 主题切换按钮 + 拖拽监听 + 安装按钮 |
| `src/components/settings/Settings.tsx` | 卡片式布局 + 主题配置 |
| `src/components/skills/SkillList.tsx` | 适配 dashboard view |

---

## 7. 不做的事（YAGNI）

- 不做 IDE 式多面板工作台（方案 B）
- 不做在线搜索（P1 阶段）
- 不做 SKILL.md 内置编辑器（P1 阶段）
- 不做 Skill 版本管理（P2 阶段）
- 不做自定义 Agent skills 路径编辑（已有添加功能）
