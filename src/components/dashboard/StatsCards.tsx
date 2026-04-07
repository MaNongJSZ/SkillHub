interface StatsCardsProps {
  totalSkills: number
  totalAgents: number
  enabledLinks: number
}

export default function StatsCards({
  totalSkills,
  totalAgents,
  enabledLinks,
}: StatsCardsProps) {
  const cards = [
    { label: 'Skills', value: totalSkills },
    { label: 'Agents', value: totalAgents },
    { label: '已启用链接', value: enabledLinks },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-[color:var(--text-secondary)]/25 bg-[var(--bg-secondary)]/70 px-4 py-3"
        >
          <div className="text-xs text-[var(--text-secondary)]">{card.label}</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{card.value}</div>
        </div>
      ))}
    </div>
  )
}
