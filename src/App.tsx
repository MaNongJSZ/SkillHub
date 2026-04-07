import { useEffect } from "react";
import AgentPanel from "./components/agents/AgentPanel";
import Dashboard from "./components/dashboard/Dashboard";
import MainLayout from "./components/layout/MainLayout";
import SearchResults from "./components/search/SearchResults";
import Settings from "./components/settings/Settings";
import SkillDetail from "./components/skills/SkillDetail";
import SkillList from "./components/skills/SkillList";
import { useAppStore } from "./stores/useAppStore";

function App() {
  const { view, loadConfig, loadAgents, loadSkills } = useAppStore();

  useEffect(() => {
    void loadConfig();
    void loadAgents();
    void loadSkills();
  }, [loadAgents, loadConfig, loadSkills]);

  const renderContent = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard />;
      case "detail":
        return <SkillDetail />;
      case "search":
        return <SearchResults />;
      case "settings":
        return <Settings />;
      case "agents":
        return <AgentPanel />;
      case "list":
        return (
          <div className="flex flex-1 items-center justify-center text-[var(--text-secondary)]">
            从左侧选择一个 Skill
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout
      sidebar={<SkillList />}
    >
      {renderContent()}
    </MainLayout>
  );
}

export default App;
