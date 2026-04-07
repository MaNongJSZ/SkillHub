import { useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";

export default function AgentBar() {
  const { agents, loadAgents } = useAppStore();

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  if (agents.length === 0) {
    return null;
  }

  return (
    <div className="flex h-10 items-center gap-3 border-t border-gray-800 bg-gray-900/50 px-4">
      <span className="text-xs text-gray-600">Agents:</span>
      <div className="flex gap-2 overflow-x-auto">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-gray-800/50 px-2.5 py-1"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-400">{agent.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
