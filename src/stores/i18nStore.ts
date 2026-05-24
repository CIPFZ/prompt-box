import { create } from "zustand";
import type { Lang, TranslationKey } from "../i18n/translations";
import { t } from "../i18n/translations";

interface I18nState {
  lang: Lang;
  toggle: () => void;
  tt: (key: TranslationKey) => string;
}

function detectLang(): Lang {
  const stored = localStorage.getItem("promptbox-lang");
  if (stored === "en" || stored === "zh") return stored;
  // Detect from browser
  const nav = navigator.language || "";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: detectLang(),

  toggle: () => {
    const next = get().lang === "zh" ? "en" : "zh";
    localStorage.setItem("promptbox-lang", next);
    set({ lang: next });
  },

  tt: (key: TranslationKey) => {
    return t[get().lang][key] || t.en[key] || key;
  },
}));
