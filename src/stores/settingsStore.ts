import { create } from "zustand";
import type { ApiConfig, AppSettings } from "../types";
import * as api from "../lib/tauri-api";

interface SettingsState {
  settings: AppSettings | null;
  apiConfigs: ApiConfig[];
  loading: boolean;
  testResult: string | null;
  testing: boolean;

  load: () => Promise<void>;
  loadApiConfigs: () => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveApiConfig: (config: {
    id?: number | null;
    name: string;
    api_type: string;
    base_url: string;
    endpoint: string;
    api_key?: string | null;
    extra_params?: string | null;
    is_active: boolean;
  }) => Promise<void>;
  deleteApiConfig: (id: number) => Promise<void>;
  testConnection: (configId: number) => Promise<void>;
  clearTestResult: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  apiConfigs: [],
  loading: false,
  testResult: null,
  testing: false,

  load: async () => {
    set({ loading: true });
    try {
      const [settings, apiConfigs] = await Promise.all([
        api.getSettings(),
        api.getApiConfigs(),
      ]);
      set({ settings, apiConfigs });
    } catch (e) {
      console.error("加载设置失败:", e);
    } finally {
      set({ loading: false });
    }
  },

  loadApiConfigs: async () => {
    const apiConfigs = await api.getApiConfigs();
    set({ apiConfigs });
  },

  saveSettings: async (s) => {
    await api.saveSettings(s);
    set({ settings: s });
  },

  saveApiConfig: async (config) => {
    await api.saveApiConfig(config);
    get().loadApiConfigs();
  },

  deleteApiConfig: async (id) => {
    await api.deleteApiConfig(id);
    get().loadApiConfigs();
  },

  testConnection: async (configId) => {
    set({ testing: true, testResult: null });
    try {
      const result = await api.testApiConnection(configId);
      set({ testResult: result, testing: false });
    } catch (e) {
      set({ testResult: `失败: ${e}`, testing: false });
    }
  },

  clearTestResult: () => set({ testResult: null }),
}));
