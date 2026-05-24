import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettingsStore } from "../stores/settingsStore";

interface Props {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchTags?: string[];
  onSearchTagsChange?: (tags: string[]) => void;
  onClearFilter?: () => void;
  allTags?: string[];
  showSearch?: boolean;
  totalCount?: number;
}

export default function TopBar({
  searchQuery = "",
  onSearchChange,
  searchTags = [],
  onSearchTagsChange,
  onClearFilter,
  allTags = [],
  showSearch = false,
  totalCount = 0,
}: Props) {
  const location = useLocation();
  const isGallery = location.pathname === "/";
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const [searchOpen, setSearchOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dark = settings?.theme === "dark";
  const hasFilter = searchQuery || searchTags.length > 0;

  function toggleDark() {
    if (settings) {
      saveSettings({ ...settings, theme: dark ? "light" : "dark" });
    }
  }

  function toggleTag(tag: string) {
    if (searchTags.includes(tag)) {
      onSearchTagsChange?.(searchTags.filter((t) => t !== tag));
    } else {
      onSearchTagsChange?.([...searchTags, tag]);
    }
  }

  function clearAll() {
    onClearFilter?.();
    setSearchOpen(false);
  }

  // Focus input when panel opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    if (!searchOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  return (
    <>
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 flex-shrink-0 relative z-30">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <span className="text-base font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
            PromptBox
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right-side toolbar */}
        <div className="flex items-center gap-1">
          {isGallery && showSearch && (
            <button
              onClick={() => setSearchOpen(true)}
              className={`relative p-2 rounded-lg transition-colors ${
                hasFilter
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {hasFilter && searchTags.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[9px] px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                  {searchTags.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={toggleDark}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={dark ? "浅色模式" : "暗色模式"}
          >
            {dark ? (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <Link
            to="/settings"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="设置"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          <Link
            to={isGallery ? "/create" : "/"}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 ml-1"
          >
            {isGallery ? "+ 新增" : "返回画廊"}
          </Link>
        </div>
      </header>

      {/* Search Modal — Spotlight style */}
      {isGallery && showSearch && searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setSearchOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-xl mx-4 overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="搜索标题..."
                className="flex-1 bg-transparent text-base outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
              />
              {hasFilter && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                >
                  清除全部
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
              {/* Tags section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">标签</span>
                  {searchTags.length > 0 && (
                    <span className="text-[10px] text-gray-400">{searchTags.length} 个已选</span>
                  )}
                </div>

                {/* Selected tags */}
                {searchTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {searchTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium"
                      >
                        {tag}
                        <button onClick={() => toggleTag(tag)} className="hover:text-blue-900 dark:hover:text-white ml-0.5">x</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Available tags grid */}
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const active = searchTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                          active
                            ? "bg-blue-600 text-white ring-2 ring-blue-600"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {allTags.length === 0 && (
                    <span className="text-xs text-gray-400 py-2">暂无标签，创建 prompt 时添加</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
              <span>ESC 关闭</span>
              {totalCount > 0 && <span>{totalCount} 条记录</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
