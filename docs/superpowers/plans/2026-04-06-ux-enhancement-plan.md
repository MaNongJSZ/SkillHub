# SkillForge UX 增强与三态主题切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SkillForge 增加高频用户向的 UX 增强（Dashboard、批量操作、全局搜索、快速安装、Toast、快捷键）并实现亮/暗/系统三态主题切换。

**Architecture:** 在现有 React + Zustand 架构上做渐进增强，不重构 Rust 核心。新增独立的 theme/toast/dashboard/ui 子模块，保持现有 `useAppStore` 为主数据流，新增 `useThemeStore` 与 `useToastStore` 管理横切状态。所有功能通过现有 Tauri commands 组合实现。

**Tech Stack:** React 19, TypeScript, Zustand, TailwindCSS v4, Tauri invoke, Vitest + Testing Library

---

## 文件结构总览

### 新增文件

- `src/stores/useThemeStore.ts` — 三态主题状态、系统主题监听、持久化
- `src/stores/useToastStore.ts` — Toast 队列管理
- `src/hooks/useKeyboard.ts` — 全局快捷键注册工具
- `src/components/dashboard/Dashboard.tsx` — 仪表盘容器
- `src/components/dashboard/StatsCards.tsx` — 统计卡片
- `src/components/dashboard/MatrixGrid.tsx` — Agent×Skill 矩阵 + 批量操作
- `src/components/ui/CommandPalette.tsx` — Ctrl+K 全局搜索浮层
- `src/components/ui/Toast.tsx` — Toast 渲染组件
- `src/components/install/InstallDialog.tsx` — 安装弹窗（路径输入 + 拖拽入口）
- `src/test/setup.ts` — 测试环境初始化

### 修改文件

- `package.json` — 增加测试脚本与依赖
- `src/main.tsx` — 注入主题初始化
- `src/index.css` — 主题 CSS 变量与暗黑变量
- `src/types/index.ts` — 补充 dashboard/批量相关类型（如需要）
- `src/stores/useAppStore.ts` — 新增 dashboard view 与批量/安装 action
- `src/App.tsx` — 默认页面改为 dashboard，挂载新 UI 组件
- `src/components/layout/MainLayout.tsx` — Header 增加主题、安装按钮；拖拽监听；快捷键挂载
- `src/components/settings/Settings.tsx` — 新增主题三态配置
- `src/components/skills/SkillList.tsx` — 兼容 dashboard 导航与状态

### 测试文件

- `src/stores/useThemeStore.test.ts`
- `src/hooks/useKeyboard.test.tsx`
- `src/components/dashboard/MatrixGrid.test.tsx`
- `src/components/ui/CommandPalette.test.tsx`
- `src/components/install/InstallDialog.test.tsx`

---

### Task 1: 建立测试基础设施（先测后改）

**Files:**
- Modify: `package.json`
- Create: `src/test/setup.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: 添加失败测试依赖配置**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^2.1.9",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1"
  }
}
```

- [ ] **Step 2: 配置 Vitest（先让测试可运行）**

在 `vite.config.ts` 增加：

```ts
test: {
  environment: "jsdom",
  setupFiles: "./src/test/setup.ts",
  globals: true,
}
```

- [ ] **Step 3: 创建测试初始化文件**

`src/test/setup.ts`:

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: 运行测试验证基建可用**

Run: `npm run test`
Expected: 通过（0 tests）或仅提示无测试文件。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts
git commit -m "test: add vitest and testing-library baseline"
```

---

### Task 2: 实现三态主题 store（TDD）

**Files:**
- Create: `src/stores/useThemeStore.ts`
- Test: `src/stores/useThemeStore.test.ts`

- [ ] **Step 1: 先写失败测试（默认值、持久化、系统模式）**

`src/stores/useThemeStore.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useThemeStore } from "./useThemeStore";

describe("useThemeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ theme: "system", resolved: "light" });
  });

  it("uses system by default", () => {
    expect(useThemeStore.getState().theme).toBe("system");
  });

  it("persists selected theme", () => {
    useThemeStore.getState().setTheme("dark");
    expect(localStorage.getItem("skillforge-theme")).toBe("dark");
  });
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test -- src/stores/useThemeStore.test.ts`
Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 写最小实现让测试通过**

`src/stores/useThemeStore.ts`:

```ts
import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  resolved: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

const KEY = "skillforge-theme";

function resolveSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  resolved: "light",
  setTheme: (theme) => {
    const resolved = theme === "system" ? resolveSystemTheme() : theme;
    localStorage.setItem(KEY, theme);
    applyTheme(resolved);
    set({ theme, resolved });
  },
  initTheme: () => {
    const saved = (localStorage.getItem(KEY) as ThemeMode | null) ?? "system";
    get().setTheme(saved);
  },
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test -- src/stores/useThemeStore.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/stores/useThemeStore.ts src/stores/useThemeStore.test.ts
git commit -m "feat(theme): add light/dark/system theme store"
```

---

### Task 3: 接入主题到入口与样式层（TDD）

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 写失败测试（html.dark 切换行为）**

在 `src/stores/useThemeStore.test.ts` 追加：

```ts
it("applies dark class to html when resolved is dark", () => {
  useThemeStore.getState().setTheme("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- src/stores/useThemeStore.test.ts`
Expected: FAIL（若 class 未正确应用）。

- [ ] **Step 3: 在入口初始化主题**

`src/main.tsx` 关键改动：

```ts
import { useThemeStore } from "./stores/useThemeStore";

useThemeStore.getState().initTheme();
```

- [ ] **Step 4: 增加主题 CSS 变量（保留现有样式）**

在 `src/index.css` 顶部增加：

```css
:root {
  --bg-primary: #f9fafb;
  --bg-secondary: #ffffff;
  --text-primary: #111827;
  --text-secondary: #4b5563;
}

.dark {
  --bg-primary: #030712;
  --bg-secondary: #111827;
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
}
```

- [ ] **Step 5: 运行全量测试**

Run: `npm run test`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/index.css src/stores/useThemeStore.test.ts
git commit -m "feat(theme): initialize theme and add css variables"
```

---

### Task 4: Header 增加主题切换 + Settings 增加三态配置（TDD）

**Files:**
- Modify: `src/components/layout/MainLayout.tsx`
- Modify: `src/components/settings/Settings.tsx`
- Test: `src/components/settings/Settings.test.tsx`

- [ ] **Step 1: 先写失败测试（Settings 出现主题选项）**

`src/components/settings/Settings.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Settings from "./Settings";

it("renders three theme options", () => {
  render(<Settings />);
  expect(screen.getByText("亮色")).toBeInTheDocument();
  expect(screen.getByText("暗色")).toBeInTheDocument();
  expect(screen.getByText("跟随系统")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- src/components/settings/Settings.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 修改 MainLayout 添加主题切换按钮**

在 Header 设置按钮旁新增：

```tsx
<button
  onClick={() => {
    const { theme, setTheme } = useThemeStore.getState();
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }}
>
  主题
</button>
```

- [ ] **Step 4: 修改 Settings 添加主题三态卡片**

在设置页新增外观区：

```tsx
<div>
  <h3>外观</h3>
  <div className="grid grid-cols-3 gap-2">
    {[
      { key: "light", label: "亮色" },
      { key: "dark", label: "暗色" },
      { key: "system", label: "跟随系统" },
    ].map((item) => (
      <button key={item.key} onClick={() => setTheme(item.key as any)}>
        {item.label}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm run test -- src/components/settings/Settings.test.tsx`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/MainLayout.tsx src/components/settings/Settings.tsx src/components/settings/Settings.test.tsx
git commit -m "feat(theme): add theme switch in header and settings"
```

---

### Task 5: 实现 Dashboard 与矩阵批量操作（TDD）

**Files:**
- Create: `src/components/dashboard/Dashboard.tsx`
- Create: `src/components/dashboard/StatsCards.tsx`
- Create: `src/components/dashboard/MatrixGrid.tsx`
- Modify: `src/stores/useAppStore.ts`
- Modify: `src/App.tsx`
- Test: `src/components/dashboard/MatrixGrid.test.tsx`

- [ ] **Step 1: 写失败测试（点击矩阵单元触发切换）**

`src/components/dashboard/MatrixGrid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatrixGrid from "./MatrixGrid";

it("toggles cell when clicked", async () => {
  const onToggle = vi.fn();
  render(
    <MatrixGrid
      rows={[{ skillName: "code-review", states: { claude: true } }]}
      agentIds={["claude"]}
      onToggle={onToggle}
      onBatchEnable={vi.fn()}
      onBatchDisable={vi.fn()}
    />
  );

  await userEvent.click(screen.getByRole("button", { name: "code-review-claude" }));
  expect(onToggle).toHaveBeenCalledWith("code-review", "claude", true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- src/components/dashboard/MatrixGrid.test.tsx`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 新增最小 Dashboard 组件并接入 App**

`src/App.tsx` 关键切换：

```tsx
case "dashboard":
  return <Dashboard />;
```

默认视图改为：

```ts
view: "dashboard"
```

- [ ] **Step 4: 实现 MatrixGrid 最小可交互版本**

`src/components/dashboard/MatrixGrid.tsx`:

```tsx
export default function MatrixGrid({ rows, agentIds, onToggle, onBatchEnable, onBatchDisable }: Props) {
  return (
    <div>
      {rows.map((row) => (
        <div key={row.skillName}>
          {agentIds.map((agentId) => {
            const enabled = Boolean(row.states[agentId]);
            return (
              <button
                key={agentId}
                aria-label={`${row.skillName}-${agentId}`}
                onClick={() => onToggle(row.skillName, agentId, enabled)}
              >
                {enabled ? "✅" : "○"}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: 在 `useAppStore` 增加批量 action**

```ts
batchEnableSkills: async (skillNames, agentIds) => {
  const { batchEnable } = useLinks();
  await batchEnable(skillNames, agentIds);
},
batchDisableSkills: async (skillNames, agentIds) => {
  for (const skillName of skillNames) {
    for (const agentId of agentIds) {
      await get().disableSkill(skillName, agentId);
    }
  }
},
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm run test -- src/components/dashboard/MatrixGrid.test.tsx`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard src/stores/useAppStore.ts src/App.tsx src/components/dashboard/MatrixGrid.test.tsx
git commit -m "feat(dashboard): add matrix overview with batch actions"
```

---

### Task 6: 实现 Command Palette（Ctrl+K）与快捷键（TDD）

**Files:**
- Create: `src/components/ui/CommandPalette.tsx`
- Create: `src/hooks/useKeyboard.ts`
- Modify: `src/components/layout/MainLayout.tsx`
- Test: `src/components/ui/CommandPalette.test.tsx`
- Test: `src/hooks/useKeyboard.test.tsx`

- [ ] **Step 1: 写失败测试（Ctrl+K 打开面板）**

`src/hooks/useKeyboard.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { useState } from "react";
import { useKeyboard } from "./useKeyboard";

function Demo() {
  const [open, setOpen] = useState(false);
  useKeyboard({ "ctrl+k": () => setOpen(true) });
  return <div>{open ? "OPEN" : "CLOSED"}</div>;
}

it("opens when pressing ctrl+k", () => {
  render(<Demo />);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  expect(document.body.textContent).toContain("OPEN");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- src/hooks/useKeyboard.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 `useKeyboard` 最小版本**

```ts
export function useKeyboard(bindings: Record<string, () => void>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? "ctrl+" : ""}${e.key.toLowerCase()}`;
      const handler = bindings[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}
```

- [ ] **Step 4: 实现 `CommandPalette` 组件**

要求最小可用：
- 接收 `open`、`onClose`、`results`、`onSelect`
- `Esc` 关闭
- 结果列表可点击

- [ ] **Step 5: 在 MainLayout 接入快捷键**

```tsx
useKeyboard({
  "ctrl+k": () => setCommandPaletteOpen(true),
  "ctrl+b": () => setSidebarOpen(!sidebarOpen),
});
```

- [ ] **Step 6: 运行对应测试**

Run: `npm run test -- src/hooks/useKeyboard.test.tsx src/components/ui/CommandPalette.test.tsx`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useKeyboard.ts src/components/ui/CommandPalette.tsx src/components/layout/MainLayout.tsx src/hooks/useKeyboard.test.tsx src/components/ui/CommandPalette.test.tsx
git commit -m "feat(search): add command palette and global keyboard shortcuts"
```

---

### Task 7: 实现安装弹窗 + 拖拽安装 + Toast 反馈（TDD）

**Files:**
- Create: `src/components/install/InstallDialog.tsx`
- Create: `src/components/ui/Toast.tsx`
- Create: `src/stores/useToastStore.ts`
- Modify: `src/components/layout/MainLayout.tsx`
- Modify: `src/stores/useAppStore.ts`
- Test: `src/components/install/InstallDialog.test.tsx`

- [ ] **Step 1: 写失败测试（提交路径触发安装）**

`src/components/install/InstallDialog.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstallDialog from "./InstallDialog";

it("submits path install", async () => {
  const onInstall = vi.fn().mockResolvedValue(undefined);
  render(<InstallDialog open onClose={vi.fn()} onInstallPath={onInstall} />);

  await userEvent.type(screen.getByPlaceholderText("输入本地路径"), "C:/skills/weather");
  await userEvent.click(screen.getByRole("button", { name: "安装" }));

  expect(onInstall).toHaveBeenCalledWith("C:/skills/weather");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- src/components/install/InstallDialog.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 `useToastStore` 与 `Toast` 组件**

`useToastStore.ts`:

```ts
interface ToastItem { id: string; type: "success" | "error" | "info"; message: string; }
```

提供 `pushToast` / `removeToast`。

- [ ] **Step 4: 实现 InstallDialog 最小可用版**

- 输入路径
- 调用 `onInstallPath`
- 成功后 `pushToast({type:"success"})`
- 失败后 `pushToast({type:"error"})`

- [ ] **Step 5: 在 MainLayout 增加拖拽安装监听**

```tsx
useEffect(() => {
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.path) {
      await installFromPath(file.path);
      pushToast({ type: "success", message: "安装成功" });
    }
  };
  window.addEventListener("drop", onDrop);
  return () => window.removeEventListener("drop", onDrop);
}, [installFromPath]);
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm run test -- src/components/install/InstallDialog.test.tsx`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/components/install/InstallDialog.tsx src/components/ui/Toast.tsx src/stores/useToastStore.ts src/components/layout/MainLayout.tsx src/stores/useAppStore.ts src/components/install/InstallDialog.test.tsx
git commit -m "feat(ux): add install dialog drag-drop install and toast feedback"
```

---

### Task 8: 联调、回归测试与收尾

**Files:**
- Modify: `src/components/skills/SkillList.tsx`（必要兼容）
- Modify: `README.md`（仅在已有该节时补充快捷键与主题）

- [ ] **Step 1: 运行单元测试全量回归**

Run: `npm run test`
Expected: 全部 PASS。

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误输出。

- [ ] **Step 3: 运行构建验证**

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 4: 手工验收清单**

- 主题三态切换（亮/暗/系统）生效且重启保持
- Dashboard 默认展示，矩阵切换可用
- 批量启用/禁用生效
- Ctrl+K 搜索可打开/关闭并选中结果
- 安装弹窗可安装路径，拖拽安装可用
- Toast 提示在成功/失败时显示

- [ ] **Step 5: Commit**

```bash
git add src README.md
git commit -m "feat: complete ux enhancements with dashboard search install and theme"
```

---

## 计划自检

### 1) Spec 覆盖检查

- 主题系统（三态 + 系统监听 + 持久化）→ Task 2/3/4
- Dashboard 统计 + 矩阵 + 批量操作 → Task 5
- Ctrl+K 全局搜索 + 快捷键 → Task 6
- 快速安装 + 拖拽 + Toast → Task 7
- Settings 外观分组 → Task 4
- 保持渐进增强，不做方案 B → 已遵循

### 2) Placeholder 扫描

- 无 `TODO`/`TBD`/“后续补充”占位。

### 3) 类型一致性

- 主题模式统一为 `"light" | "dark" | "system"`
- Toast 类型统一为 `"success" | "error" | "info"`
- Dashboard 行键统一使用 `skillName`、`agentId`

