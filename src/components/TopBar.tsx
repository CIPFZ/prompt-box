import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettingsStore } from "../stores/settingsStore";

interface Props {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchTags?: string[];
  onSearchTagsChange?: (tags: string[]) => void;
  allTags?: string[];
  showSearch?: boolean;
  totalCount?: number;
}

export default function TopBar({
  searchQuery = "",
  onSearchChange,
  searchTags = [],
  onSearchTagsChange,
  allTags = [],
  showSearch = false,
  totalCount = 0,
}: Props) {
  const location = useLocation();
  const isGallery = location.pathname === "/";
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dark = settings?.theme === "dark";

  function toggleDark() {
    if (settings) {
      saveSettings({ ...settings, theme: dark ? "light" : "dark" });
    }
  }

  function addTag(tag: string) {
    if (!searchTags.includes(tag)) {
      onSearchTagsChange?.([...searchTags, tag]);
    }
    setTagDropdownOpen(false);
  }

  function removeTag(tag: string) {
    onSearchTagsChange?.(searchTags.filter((t) => t !== tag));
  }

  const availableTags = allTags.filter((t) => !searchTags.includes(t));

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 flex-shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          P
        </div>
        <span className="text-base font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
          PromptBox
        </span>
      </Link>

      {/* Search + tag chips — only on gallery */}
      {isGallery && showSearch && (
        <div className="flex-1 flex items-center gap-2 min-w-0 max-w-[640px]">
          <div className="relative flex-1 min-w-[160px]">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="搜索标题..."
              className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-200 text-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Filter tag chips */}
          {searchTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-blue-800 dark:hover:text-blue-300"
              >
                x
              </button>
            </span>
          ))}

          {/* Tag dropdown */}
          <div ref={dropdownRef} className="relative flex-shrink-0">
            <button
              onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap"
            >
              + 标签
            </button>
            {tagDropdownOpen && availableTags.length > 0 && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto min-w-[120px]">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear filters */}
          {(searchQuery || searchTags.length > 0) && (
            <button
              onClick={() => { onSearchChange?.(""); onSearchTagsChange?.([]); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 whitespace-nowrap flex-shrink-0"
            >
              清除
            </button>
          )}

          {/* Count */}
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-1">
            {totalCount}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Dark mode toggle */}
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

      {/* Settings */}
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

      {/* New / Back */}
      <Link
        to={isGallery ? "/create" : "/"}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 flex-shrink-0"
      >
        {isGallery ? "+ 新增" : "返回画廊"}
      </Link>
    </header>
  );
}
