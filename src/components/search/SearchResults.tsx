import { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useToastStore } from "../../stores/useToastStore";
import { renderMarkdown } from "../../utils/markdown";

export default function SearchResults() {
  const {
    searchResults,
    selectSkill,
    searchQuery,
    searchMode,
    onlineSearchResults,
    onlineSearchLoading,
    remoteSkillDetail,
    getRemoteDetail,
    installFromOnline,
  } = useAppStore();
  const { pushToast } = useToastStore();
  const [installing, setInstalling] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSkillId, setPreviewSkillId] = useState<string | null>(null);

  // 在线模式
  if (searchMode === 'online') {
    if (onlineSearchLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-[var(--text-secondary)]">正在搜索在线 Skills...</p>
          </div>
        </div>
      );
    }

    if (onlineSearchResults.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-[var(--text-secondary)]">无搜索结果</p>
            {searchQuery && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]/70">未找到与 "{searchQuery}" 匹配的在线 Skill</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full">
        {/* 搜索结果列表 */}
        <div className="w-2/5 overflow-auto border-r border-[color:var(--text-secondary)]/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              在线搜索 <span className="text-[var(--text-secondary)]">({onlineSearchResults.length})</span>
            </h2>
          </div>

          <div className="space-y-2">
            {onlineSearchResults.map((skill) => (
              <div
                key={`${skill.source}-${skill.id}`}
                className={`group rounded-lg border px-3 py-2.5 transition-colors ${
                  previewSkillId === skill.id
                    ? 'border-blue-500/50 bg-blue-500/5'
                    : 'border-[color:var(--text-secondary)]/20 bg-[var(--bg-secondary)] hover:border-[color:var(--text-secondary)]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)]">{skill.name}</div>
                    {skill.description && (
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">{skill.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                      <span className="rounded bg-gray-500/10 px-1.5 py-0.5 text-gray-400">
                        GitHub
                      </span>
                      {skill.author && <span>@{skill.author}</span>}
                    </div>
                    {skill.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => {
                      setPreviewSkillId(skill.id);
                      void getRemoteDetail(skill.source, skill.id);
                    }}
                    className="rounded-md bg-[var(--bg-primary)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    预览
                  </button>
                  <button
                    onClick={() => {
                      setInstalling(skill.id);
                      installFromOnline(skill.source, skill.id, skill.install_url)
                        .then(() => pushToast({ type: 'success', message: `${skill.name} 安装成功` }))
                        .catch((e) => pushToast({ type: 'error', message: `安装失败: ${e}` }))
                        .finally(() => setInstalling(null));
                    }}
                    disabled={installing === skill.id}
                    className="rounded-md bg-blue-600/80 px-2.5 py-1 text-xs text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    {installing === skill.id ? '安装中...' : '安装'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 预览面板 */}
        <div className="flex-1 overflow-auto p-6">
          {remoteSkillDetail && previewSkillId ? (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{remoteSkillDetail.skill.name}</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    GitHub · {remoteSkillDetail.skill.author}
                    {remoteSkillDetail.last_updated && ` · 更新于 ${remoteSkillDetail.last_updated.slice(0, 10)}`}
                  </p>
                </div>
              </div>
              {remoteSkillDetail.skill.description && (
                <p className="mb-4 text-sm text-[var(--text-secondary)]">{remoteSkillDetail.skill.description}</p>
              )}
              <RemoteSkillPreview content={remoteSkillDetail.content} onHtml={setPreviewHtml} />
              <div
                className="prose mt-4 max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-[var(--text-secondary)]">点击"预览"查看 Skill 详情</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 本地模式（原有逻辑）
  if (searchResults.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[var(--text-secondary)]">无搜索结果</p>
          {searchQuery && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]/70">未找到与 "{searchQuery}" 匹配的 Skill</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          搜索结果 <span className="text-[var(--text-secondary)]">({searchResults.length})</span>
        </h2>
      </div>

      <div className="space-y-1">
        {searchResults.map((result, index) => (
          <div
            key={`${result.skill_name}-${result.matched_field}-${index}`}
            onClick={() => {
              void selectSkill(result.skill_name);
            }}
            className="group flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-secondary)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-secondary)]">
              <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[var(--text-primary)] group-hover:text-blue-400">{result.skill_name}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px]">{result.matched_field}</span>
                <span className="ml-2">{result.matched_text}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 远程 skill markdown 预览子组件 */
function RemoteSkillPreview({ content, onHtml }: { content: string; onHtml: (html: string) => void }) {
  if (!content) {
    return <p className="text-sm text-[var(--text-secondary)]">暂无内容预览</p>;
  }

  void renderMarkdown(content).then(onHtml);

  return null;
}
