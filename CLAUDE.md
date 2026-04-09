# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

SkillHub 是基于 Tauri 2 的跨平台桌面应用，用于统一管理多个 AI IDE/Agent（Claude Code、Cursor、Kiro、Codex、OpenClaw）的 Skills。通过中央仓库 + symlink/junction 机制实现一处安装、多处复用。

## 常用命令

```bash
# 开发（启动 Tauri 热重载）
npm run tauri dev

# 仅构建前端
npm run build

# 生产打包（跨平台桌面安装包）
npm run tauri build

# 运行测试
npm run test

# 测试 watch 模式
npm run test:watch

# 代码检查
npx eslint src/
```

## 架构

### 双层结构：Rust 后端 + React 前端

**前端**（`src/`）：React 19 + TypeScript + TailwindCSS + Zustand，通过 Tauri `invoke` 调用后端。

- `src/hooks/useInvoke.ts` — 所有 Tauri 命令的类型安全封装，按领域分组（config/skills/agents/links/search/online/update）
- `src/stores/useAppStore.ts` — Zustand 全局状态，持有 skills、agents、search、config 等状态及所有异步操作
- `src/types/index.ts` — 前后端共享的类型定义（Skill、Agent、SkillLink、SearchResult 等）
- `src/components/` — 按功能域组织：skills/、agents/、dashboard/、search/、settings/、layout/、ui/

**后端**（`src-tauri/src/`）：Rust，Tauri 命令模式。

- `commands/` — Tauri 命令层，按领域拆分：skill_cmd、agent_cmd、link_cmd、search_cmd、online_cmd、config_cmd
- `core/` — 业务逻辑层：
  - `config.rs` — ConfigManager，管理 `~/.skillhub/config.json`
  - `registry.rs` — Skill 注册表，管理中央仓库 `~/.cc-switch/skills/`
  - `agent.rs` — Agent 检测与管理
  - `symlink.rs` — symlink/junction 创建与删除（Windows 优先 symlink，回退 junction）
  - `installer.rs` — Skill 安装逻辑
  - `search.rs` — 本地全文搜索
  - `github_source.rs` + `source.rs` — 在线 GitHub 源搜索
  - `git_clone.rs` — Git 仓库克隆安装
  - `cache.rs` — HTTP 缓存管理
- `error.rs` — 统一错误类型 SkillHubError，使用 thiserror 派生

### 数据流

```
React 组件 → useAppStore (Zustand) → useInvoke hooks → Tauri invoke() → Rust commands → core 模块
```

### 关键数据路径

- 中央仓库：`~/.cc-switch/skills/`
- 配置文件：`~/.skillhub/config.json`
- 缓存目录：`~/.skillhub/cache/`

## 约定

- **前后端类型同步**：`src/types/index.ts` 中的接口必须与 Rust 的 `#[tauri::command]` 函数签名保持一致，修改一方需同步另一方
- **Tauri 命令注册**：新增命令需在 `src-tauri/src/main.rs` 的 `invoke_handler` 宏中注册
- **状态管理**：所有数据获取和变更通过 `useAppStore` 的 action 方法，组件不直接调用 `invoke`
- **样式**：TailwindCSS，使用 CSS 变量主题（`var(--text-secondary)` 等），亮/暗色通过 `useThemeStore` 切换
- **错误处理**：Rust 端使用 `SkillHubError` 枚举，前端在 store action 中 try/catch 并 console.error
- **窗口行为**：关闭窗口时隐藏到系统托盘而非退出，托盘菜单提供"显示"和"退出"选项

## 测试

- Vitest + JSDOM + React Testing Library
- 配置在 `vite.config.ts` 的 `test` 字段
- Setup 文件：`src/test/setup.ts`

## 发布流程

GitHub Actions 自动发布（`.github/workflows/release.yml`），基于 tag 触发，使用 Tauri Action 构建多平台安装包。

### 发版步骤

每次发版**必须同步更新以下三个文件的版本号**：

1. `package.json` — `"version": "x.y.z"`（前端 `__APP_VERSION__` 读取来源）
2. `src-tauri/Cargo.toml` — `version = "x.y.z"`（Rust `CARGO_PKG_VERSION` 读取来源）
3. `src-tauri/tauri.conf.json` — `"version": "x.y.z"`（Tauri 打包版本号）

```bash
# 1. 更新上述三个文件的版本号后提交
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to x.y.z"
git push origin main

# 2. 打 tag 并推送（触发 GitHub Actions 自动构建发布）
git tag vx.y.z
git push origin vx.y.z
```

**注意**：只打 tag 不改源码版本号，安装后仍显示旧版本。

### CI 工作流说明

Release 分两个 job：
1. `create-release`：先创建 GitHub Release（只跑一次，避免并发冲突）
2. `build`：并行构建 Windows/macOS/Linux 安装包并上传

### 更新检查

设置页通过 GitHub API 检查最新 Release 版本，使用用户配置的 GitHub Token 避免 API 限流。检测到新版本后通过 `opener` 插件打开浏览器下载页，需手动下载安装。
