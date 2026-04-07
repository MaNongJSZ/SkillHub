# SkillHub

跨平台桌面应用，用于统一管理多个 AI IDE/Agent 的 Skills，提供一处安装、多端复用的本地工作流。

## 项目简介

SkillHub 聚焦于多 Agent 环境下的 Skill 管理痛点：

- 不同工具（Claude Code、Cursor、Kiro、Codex、OpenClaw）目录结构不一致
- 重复安装与同步成本高
- 缺少统一搜索、查看和启停入口

SkillHub 通过中央仓库 + 链接机制，将 Skill 统一维护并分发到各 Agent 环境。

## 核心功能

- 统一管理多个 Agent 的 Skills
- 一处安装，多处生效（symlink/junction）
- 按 Agent 启用/禁用 Skill
- 查看 `SKILL.md`（Markdown 渲染）
- 本地全文搜索 Skill 内容
- 自定义 Agent 配置与自动检测

## 技术栈

- **桌面框架**: Tauri 2
- **后端**: Rust
- **前端**: React 19 + TypeScript + TailwindCSS
- **状态管理**: Zustand
- **构建工具**: Vite
- **测试**: Vitest + Testing Library

## 安装与运行

### 环境要求

- Node.js 18+
- Rust 工具链（含 `cargo`）
- Tauri 2 构建依赖（按官方文档安装）

### 开发启动

```bash
npm install
npm run tauri dev
```

### 前端构建

```bash
npm run build
```

### 桌面打包

```bash
npm run tauri build
```

### 运行测试

```bash
npm run test
```

## 目录与数据路径

- 中央仓库: `~/.cc-switch/skills/`
- 配置文件: `~/.skillhub/config.json`
- 缓存目录: `~/.skillhub/cache/`

## Windows Symlink 说明

在 Windows 上会优先创建 symlink；若权限或系统策略限制，会自动回退到 Junction。

建议开启"开发者模式"以获得更稳定的符号链接体验。

## 贡献指南

欢迎提交 Issue 与 PR。

- 提交前请先运行测试：`npm run test`
- 保持代码风格与现有结构一致
- PR 描述请包含：变更目的、主要改动、验证方式

## 许可证

MIT License - see LICENSE file for details
