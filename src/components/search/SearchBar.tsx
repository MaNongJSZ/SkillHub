import { type FormEvent, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/useAppStore";

export default function SearchBar() {
  const { searchQuery, search, searchMode, setSearchMode, searchOnline } = useAppStore();
  const [input, setInput] = useState(searchQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchMode === 'online') {
      void searchOnline(input);
    } else {
      void search(input);
    }
  };

  const handleClear = () => {
    setInput("");
    void search("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
        focused
          ? "border-blue-500/50 bg-[var(--bg-secondary)]"
          : "border-[color:var(--text-secondary)] bg-[var(--bg-secondary)]"
      }`}>
        <svg className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={searchMode === 'online' ? "搜索在线 Skills..." : "搜索本地 Skills..."}
          className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/80 focus:outline-none"
        />
        {input && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded p-0.5 text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="flex shrink-0 rounded-md border border-[color:var(--text-secondary)]/30 p-0.5">
          <button
            type="button"
            onClick={() => setSearchMode('local')}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
              searchMode === 'local'
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            本地
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('online')}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
              searchMode === 'online'
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            在线
          </button>
        </div>
      </div>
    </form>
  );
}
