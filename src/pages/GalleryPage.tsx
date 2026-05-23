import { useEffect, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePromptStore } from "../stores/promptStore";
import { useTagStore } from "../stores/tagStore";
import TopBar from "../components/TopBar";
import TagInput from "../components/TagInput";
import GalleryCard from "../components/GalleryCard";

const COLUMNS = { xl: 4, lg: 3, md: 2, sm: 1 };

export default function GalleryPage() {
  const {
    items,
    total,
    page,
    loading,
    searchQuery,
    searchTags,
    fetchPage,
    setSearch,
    loadTags,
    refresh,
  } = usePromptStore();

  const tagStore = useTagStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedPages = useRef(new Set<number>());

  // Determine column count based on container width
  const rawWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const cols: number = useMemo(() => {
    if (rawWidth >= 1280) return COLUMNS.xl;
    if (rawWidth >= 1024) return COLUMNS.lg;
    if (rawWidth >= 768) return COLUMNS.md;
    return COLUMNS.sm;
  }, [rawWidth]);

  const rows = Math.ceil(items.length / cols);

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 320,
    overscan: 2,
  });

  // Initial load
  useEffect(() => {
    refresh();
    loadTags();
    tagStore.load();
  }, []);

  // Handle bottom reached for next page
  const handleScroll = useCallback(() => {
    const hasMore = items.length < total;
    const nextPage = page + 1;
    if (hasMore && !loading && !loadedPages.current.has(nextPage)) {
      const container = containerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 400) {
          loadedPages.current.add(nextPage);
          fetchPage(nextPage);
        }
      }
    }
  }, [items.length, total, page, loading, fetchPage]);

  // Helper: render a card by index
  const getItem = useCallback(
    (rowIdx: number, colIdx: number) => {
      const idx = rowIdx * cols + colIdx;
      return items[idx] || null;
    },
    [items, cols]
  );

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearch(q, searchTags)}
        showSearch
      />

      {/* Tag filter bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
        <TagInput
          value={searchTags}
          onChange={(tags) => setSearch(searchQuery, tags)}
          allTags={tagStore.allTags}
          allowCreate={false}
          placeholder="筛选标签..."
        />
        {(searchQuery || searchTags.length > 0) && (
          <button
            onClick={() => setSearch("", [])}
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0"
          >
            清除筛选
          </button>
        )}
        <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
          {total} 条记录
        </span>
      </div>

      {/* Gallery grid */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-6"
      >
        {loading && items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>暂无记录</p>
            {(searchQuery || searchTags.length > 0) && (
              <button
                onClick={() => setSearch("", [])}
                className="mt-2 text-blue-500 hover:underline"
              >
                清除筛选条件
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.key}
                className="grid gap-4"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: cols }).map((_, colIdx) => {
                  const item = getItem(virtualRow.index, colIdx);
                  if (!item) return <div key={colIdx} />;
                  return (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      onTagClick={(tag) =>
                        setSearch(searchQuery, [...searchTags, tag])
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {loading && items.length > 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">加载更多...</div>
        )}
      </div>
    </div>
  );
}
