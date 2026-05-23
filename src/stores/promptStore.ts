import { create } from "zustand";
import type { Prompt } from "../types";
import * as api from "../lib/tauri-api";

interface PromptState {
  items: Prompt[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  searchQuery: string;
  searchTags: string[];
  allTags: string[];

  fetchPage: (page: number) => Promise<void>;
  setSearch: (query: string, tags: string[]) => void;
  loadTags: () => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 40,
  loading: false,
  searchQuery: "",
  searchTags: [],
  allTags: [],

  fetchPage: async (page: number) => {
    const { searchQuery, searchTags, pageSize, items } = get();
    set({ loading: true });

    try {
      const result = await api.getPrompts({
        page,
        page_size: pageSize,
        title_query: searchQuery || undefined,
        filter_tags: searchTags.length > 0 ? searchTags.join(",") : undefined,
      });

      set({
        items: page === 1 ? result.items : [...items, ...result.items],
        total: result.total,
        page,
        loading: false,
      });
    } catch (e) {
      console.error("加载列表失败:", e);
      set({ loading: false });
    }
  },

  setSearch: (query, tags) => {
    set({ searchQuery: query, searchTags: tags, items: [], total: 0, page: 1 });
    get().fetchPage(1);
  },

  loadTags: async () => {
    try {
      const tags = await api.getAllTags();
      set({ allTags: tags });
    } catch (e) {
      console.error("加载标签失败:", e);
    }
  },

  deleteItem: async (id) => {
    await api.deletePrompt(id);
    set((s) => ({
      items: s.items.filter((p) => p.id !== id),
      total: s.total - 1,
    }));
  },

  refresh: async () => {
    set({ items: [], total: 0, page: 1 });
    await get().fetchPage(1);
  },
}));
