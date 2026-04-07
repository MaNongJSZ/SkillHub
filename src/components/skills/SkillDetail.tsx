import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { renderMarkdown } from "../../utils/markdown";

export default function SkillDetail() {
  const {
    skillDetail,
    agentLinks,
    agents,
    enableSkill,
    disableSkill,
    uninstallSkill,
  } = useAppStore();
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!skillDetail) {
      setHtml("");
      return;
    }

    void renderMarkdown(skillDetail.content).then(setHtml);
  }, [skillDetail]);

  if (!skillDetail) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-secondary)]">
            <svg className="h-8 w-8 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-[var(--text-secondary)]">选择一个 Skill 查看详情</p>
        </div>
      </div>
    );
  }

  const { skill } = skillDetail;
  const links = agentLinks.get(skill.name) ?? [];

  const handleToggle = async (agentId: string) => {
    const link = links.find((item) => item.agent_id === agentId);

    if (link?.is_enabled && !link.is_managed_link) {
      window.alert("该 Agent 中已存在同名本地目录，不是 SkillHub 创建的链接，无法在这里关闭。");
      return;
    }

    if (link?.is_enabled) {
      await disableSkill(skill.name, agentId);
      return;
    }

    await enableSkill(skill.name, agentId);
  };

  const handleUninstall = async () => {
    if (!window.confirm(`确定要卸载 "${skill.name}" 吗？`)) {
      return;
    }

    await uninstallSkill(skill.name);
  };

  return (
    <div className="h-full overflow-auto bg-[var(--bg-primary)]">
      {/* 头部信息 */}
      <div className="border-b border-[color:var(--text-secondary)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{skill.name}</h2>
                  {skill.description && (
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{skill.description}</p>
                  )}
                </div>
              </div>
              {skill.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[var(--bg-primary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                void handleUninstall();
              }}
              className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
            >
              卸载
            </button>
          </div>
        </div>
      </div>

      {/* 启用状态 */}
      <div className="mx-auto max-w-4xl px-6 pt-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          启用状态
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {agents.map((agent) => {
            const link = links.find((item) => item.agent_id === agent.id);
            const isEnabled = link?.is_enabled ?? false;
            const isManagedLink = link?.is_managed_link ?? false;
            const isNativeDir = isEnabled && !isManagedLink;

            return (
              <div
                key={agent.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  isEnabled
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-[color:var(--text-secondary)] bg-[var(--bg-secondary)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isEnabled ? "bg-emerald-500" : "bg-[var(--text-secondary)]/60"}`} />
                  <span className="text-sm text-[var(--text-primary)]">
                    {agent.name}
                    {isNativeDir ? "（本地目录）" : ""}
                  </span>
                </div>
                <button
                  onClick={() => {
                    void handleToggle(agent.id);
                  }}
                  disabled={isNativeDir}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    isNativeDir
                      ? "cursor-not-allowed bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      : isEnabled
                      ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isNativeDir ? "已存在" : isEnabled ? "已启用" : "未启用"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Markdown 内容 */}
      <div className="mx-auto max-w-4xl px-6 py-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          SKILL.md
        </h3>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
