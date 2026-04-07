import { useAppStore } from "../../stores/useAppStore";

export default function SearchResults() {
  const { searchResults, selectSkill, searchQuery } = useAppStore();

  if (searchResults.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500">无搜索结果</p>
          {searchQuery && (
            <p className="mt-1 text-sm text-gray-600">未找到与 "{searchQuery}" 匹配的 Skill</p>
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
        <h2 className="text-lg font-semibold text-white">
          搜索结果 <span className="text-gray-500">({searchResults.length})</span>
        </h2>
      </div>

      <div className="space-y-1">
        {searchResults.map((result, index) => (
          <div
            key={`${result.skill_name}-${result.matched_field}-${index}`}
            onClick={() => {
              void selectSkill(result.skill_name);
            }}
            className="group flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-gray-800/70"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-200 group-hover:text-white">{result.skill_name}</div>
              <div className="text-xs text-gray-500">
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">{result.matched_field}</span>
                <span className="ml-2">{result.matched_text}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
