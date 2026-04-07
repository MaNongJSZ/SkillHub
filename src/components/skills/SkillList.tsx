import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import SkillListItem from "./SkillListItem";

type Filter = "all" | "enabled" | "disabled";

export default function SkillList() {
  const { skills, searchQuery, searchResults, agentLinks, loadSkills, view } =
    useAppStore();
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const displaySkills = useMemo(() => {
    if (searchQuery.trim()) {
      const merged = searchResults.reduce<
        Array<{ name: string; description: string; tags: string[] }>
      >((acc, result) => {
        const exists = acc.some((item) => item.name === result.skill_name);
        if (!exists) {
          acc.push({
            name: result.skill_name,
            description: result.matched_text,
            tags: [],
          });
        }
        return acc;
      }, []);

      return merged.filter((skill) => {
        if (filter === "all") return true;
        const links = agentLinks.get(skill.name) ?? [];
        const hasEnabled = links.some((link) => link.is_enabled);
        return filter === "enabled" ? hasEnabled : !hasEnabled;
      });
    }

    return skills.filter((skill) => {
      if (filter === "all") return true;
      const links = agentLinks.get(skill.name) ?? [];
      const hasEnabled = links.some((link) => link.is_enabled);
      return filter === "enabled" ? hasEnabled : !hasEnabled;
    });
  }, [agentLinks, filter, searchQuery, searchResults, skills]);

  // 仅在 Skills 视图下显示列表
  if (
    view !== "list" &&
    view !== "detail" &&
    view !== "search" &&
    view !== "dashboard"
  ) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* 筛选 */}
      <div className="flex gap-1 px-3 py-2">
        {(["all", "enabled", "disabled"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === item
                ? "bg-blue-600/20 text-blue-500"
                : "text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]"
            }`}
          >
            {item === "all" ? "全部" : item === "enabled" ? "已启用" : "未启用"}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto px-2 pb-2">
        {displaySkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
            <svg className="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="text-xs">{searchQuery.trim() ? "无搜索结果" : "暂无 Skills"}</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {displaySkills.map((skill) => (
              <SkillListItem
                key={skill.name}
                name={skill.name}
                description={skill.description}
                tags={skill.tags}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
