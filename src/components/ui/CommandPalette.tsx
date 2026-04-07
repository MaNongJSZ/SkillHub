import { useEffect } from "react";

interface CommandPaletteResult {
  id: string;
  title: string;
  subtitle?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  results: CommandPaletteResult[];
  onSelect: (result: CommandPaletteResult) => void;
}

export default function CommandPalette({ open, onClose, results, onSelect }: CommandPaletteProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-800 px-4 py-3 text-sm text-gray-400">命令面板（Ctrl+K）</div>
        <div className="max-h-[420px] overflow-auto p-2">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500">暂无结果</div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                className="mb-1 w-full rounded-lg px-3 py-2 text-left hover:bg-gray-800"
                onClick={() => {
                  onSelect(result);
                  onClose();
                }}
              >
                <div className="text-sm font-medium text-gray-100">{result.title}</div>
                {result.subtitle ? <div className="mt-0.5 text-xs text-gray-500">{result.subtitle}</div> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
