import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useConfig, useUpdate } from "../../hooks/useInvoke";
import { useAppStore } from "../../stores/useAppStore";
import { useThemeStore, type ThemeMode } from "../../stores/useThemeStore";
import type { AppConfig } from "../../types";

const themeOptions: Array<{ key: ThemeMode; label: string; hint: string }> = [
  { key: "light", label: "浅色", hint: "始终使用浅色主题" },
  { key: "dark", label: "深色", hint: "始终使用深色主题" },
  { key: "system", label: "跟随系统", hint: "根据系统自动切换" },
];

function cardClassName() {
  return "rounded-xl border border-[color:var(--text-secondary)]/25 bg-[var(--bg-secondary)]/70 p-4";
}

export default function Settings() {
  const { config, loadConfig } = useAppStore();
  const { updateConfig } = useConfig();
  const { checkUpdate } = useUpdate();
  const { theme, setTheme } = useThemeStore();
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(config);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (config) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) {
      return;
    }

    try {
      await updateConfig(localConfig);
      await loadConfig();
      window.alert("配置已保存");
    } catch (error) {
      window.alert(`保存失败: ${String(error)}`);
    }
  };

  if (!localConfig) {
    return <div className="p-6 text-[var(--text-secondary)]">加载中...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">设置</h2>

      <section className={cardClassName()}>
        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">外观</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {themeOptions.map((option) => {
            const active = theme === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setTheme(option.key)}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-[color:var(--text-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]"
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{option.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={cardClassName()}>
        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">在线搜索</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[var(--text-secondary)]">GitHub Token</label>
            <input
              type="password"
              value={localConfig.github_token ?? ""}
              onChange={(event) =>
                setLocalConfig({
                  ...localConfig,
                  github_token: event.target.value || null,
                })
              }
              placeholder="可选，提升 GitHub 搜索频率限制"
              className="w-full rounded-lg border border-[color:var(--text-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">无 Token 时 GitHub API 限制 10 次/分钟，有 Token 提升至 5000 次/小时</p>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">路径</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[var(--text-secondary)]">中央仓库路径</label>
            <input
              type="text"
              value={localConfig.registry_path}
              className="w-full rounded-lg border border-[color:var(--text-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
              disabled
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--text-secondary)]">缓存路径</label>
            <input
              type="text"
              value={localConfig.cache_path}
              className="w-full rounded-lg border border-[color:var(--text-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
              disabled
            />
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">编辑器</h3>
        <label className="mb-1 block text-sm text-[var(--text-secondary)]">外部编辑器路径</label>
        <input
          type="text"
          value={localConfig.external_editor ?? ""}
          onChange={(event) =>
            setLocalConfig({
              ...localConfig,
              external_editor: event.target.value || null,
            })
          }
          placeholder="例如: code"
          className="w-full rounded-lg border border-[color:var(--text-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        />
      </section>

      <section className={cardClassName()}>
        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">高级</h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={localConfig.auto_detect_agents}
              onChange={(event) =>
                setLocalConfig({
                  ...localConfig,
                  auto_detect_agents: event.target.checked,
                })
              }
              className="h-4 w-4"
            />
            <span>启动时自动检测 Agents</span>
          </label>
          <div>
            <label className="mb-1 block text-sm text-[var(--text-secondary)]">
              搜索缓存有效期: {localConfig.cache_ttl_minutes} 分钟
            </label>
            <input
              type="range"
              min={10}
              max={240}
              step={10}
              value={localConfig.cache_ttl_minutes}
              onChange={(event) =>
                setLocalConfig({
                  ...localConfig,
                  cache_ttl_minutes: Number(event.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span>10 分钟</span>
              <span>240 分钟</span>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">关于与更新</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[var(--text-primary)]">SkillHub</div>
            <div className="text-xs text-[var(--text-secondary)]">当前版本 v{__APP_VERSION__}</div>
            {updateStatus && (
              <div className={`mt-1 text-xs ${updateStatus.includes("新版本") ? "text-emerald-500" : "text-[var(--text-secondary)]"}`}>
                {updateStatus}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const doCheck = async () => {
                setUpdateChecking(true);
                setUpdateStatus(null);
                try {
                  const latest = await checkUpdate();
                  if (latest) {
                    setUpdateStatus(`发现新版本 v${latest}`);
                    if (window.confirm(`发现新版本 v${latest}，点击确认前往下载页面，下载安装后重新打开即可更新。`)) {
                      await openUrl("https://github.com/MaNongJSZ/SkillHub/releases/latest");
                    }
                  } else {
                    setUpdateStatus("当前已是最新版本");
                  }
                } catch (e) {
                  setUpdateStatus(String(e).replace(/^Error:\s*/, "") || "检查更新失败");
                } finally {
                  setUpdateChecking(false);
                }
              };
              void doCheck();
            }}
            disabled={updateChecking}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {updateChecking ? "检查中..." : "检查更新"}
          </button>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={() => {
            void handleSave();
          }}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </div>
  );
}
