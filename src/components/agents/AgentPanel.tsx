import { useEffect, useState } from "react";
import { useAgents } from "../../hooks/useInvoke";
import { useAppStore } from "../../stores/useAppStore";

export default function AgentPanel() {
  const { agents, loadAgents } = useAppStore();
  const { addCustomAgent, removeAgent } = useAgents();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    id: "",
    name: "",
    skills_path: "",
  });

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const handleAdd = async () => {
    if (!newAgent.id || !newAgent.name || !newAgent.skills_path) {
      window.alert("请填写所有字段");
      return;
    }

    try {
      await addCustomAgent({
        id: newAgent.id,
        name: newAgent.name,
        skills_path: newAgent.skills_path,
        workspace_path: null,
        detected: false,
      });
      setNewAgent({ id: "", name: "", skills_path: "" });
      setShowAddForm(false);
      await loadAgents();
    } catch (error) {
      window.alert(`添加失败: ${String(error)}`);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("确定要移除此 Agent 吗？")) {
      return;
    }

    try {
      await removeAgent(id);
      await loadAgents();
    } catch (error) {
      window.alert(`移除失败: ${String(error)}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Agent 管理</h2>
            <p className="text-xs text-gray-500">{agents.length} 个 Agent</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showAddForm
              ? "bg-gray-700 text-gray-300"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={showAddForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
          </svg>
          {showAddForm ? "取消" : "添加 Agent"}
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">添加自定义 Agent</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">ID</label>
              <input
                type="text"
                placeholder="例如: my-agent"
                value={newAgent.id}
                onChange={(event) =>
                  setNewAgent((prev) => ({ ...prev, id: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">显示名称</label>
              <input
                type="text"
                placeholder="例如: My Agent"
                value={newAgent.name}
                onChange={(event) =>
                  setNewAgent((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Skills 路径</label>
              <input
                type="text"
                placeholder="例如: ~/.my-agent/skills"
                value={newAgent.skills_path}
                onChange={(event) =>
                  setNewAgent((prev) => ({ ...prev, skills_path: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                void handleAdd();
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              确认添加
            </button>
          </div>
        </div>
      )}

      {/* Agent 列表 */}
      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/30 p-4 transition-colors hover:border-gray-700"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-200">{agent.name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{agent.id}</span>
                <span className="text-gray-700">|</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                  agent.detected
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-gray-800 text-gray-400"
                }`}>
                  {agent.detected ? "自动检测" : "自定义"}
                </span>
              </div>
              <div className="truncate text-xs text-gray-600 mt-0.5">{agent.skills_path}</div>
            </div>
            {!agent.detected && (
              <button
                onClick={() => {
                  void handleRemove(agent.id);
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-red-400 opacity-0 transition-opacity hover:bg-red-500/10 group-hover:opacity-100"
              >
                移除
              </button>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p>未检测到任何 Agent</p>
        </div>
      )}
    </div>
  );
}
