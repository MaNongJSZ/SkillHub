import { useAppStore } from "../../stores/useAppStore";

interface SkillListItemProps {
  name: string;
  description: string;
  tags: string[];
}

export default function SkillListItem({
  name,
  description,
  tags,
}: SkillListItemProps) {
  const { selectSkill, selectedSkill, agentLinks } = useAppStore();

  const links = agentLinks.get(name) ?? [];
  const enabledCount = links.filter((link) => link.is_enabled).length;
  const isSelected = selectedSkill === name;

  const statusColor = enabledCount === 0
    ? "bg-gray-600"
    : enabledCount === links.length
      ? "bg-emerald-500"
      : "bg-amber-500";

  const statusRing = enabledCount === 0
    ? ""
    : enabledCount === links.length
      ? "ring-2 ring-emerald-500/30"
      : "ring-2 ring-amber-500/30";

  return (
    <div
      onClick={() => {
        void selectSkill(name);
      }}
      className={`group flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
        isSelected
          ? "bg-blue-600/10 ring-1 ring-blue-500/30"
          : "hover:bg-black/10"
      }`}
    >
      {/* 状态指示灯 */}
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusColor} ${statusRing}`} />

      {/* 内容 */}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${isSelected ? "text-blue-500" : "text-[var(--text-primary)]"}`}>
          {name}
        </div>
        {description && (
          <div className="truncate text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            {description}
          </div>
        )}
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
