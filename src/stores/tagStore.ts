import { create } from "zustand";
import * as api from "../lib/tauri-api";

interface TagState {
  allTags: string[];
  loading: boolean;
  load: () => Promise<void>;
}

export const useTagStore = create<TagState>((set) => ({
  allTags: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const tags = await api.getAllTags();
      set({ allTags: tags, loading: false });
    } catch (e) {
      console.error("加载标签失败:", e);
      set({ loading: false });
    }
  },
}));
