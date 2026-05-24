import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import GalleryPage from "./pages/GalleryPage";
import PromptDetailPage from "./pages/PromptDetailPage";
import PromptFormPage from "./pages/PromptFormPage";
import SettingsPage from "./pages/SettingsPage";
import ToastContainer from "./components/ToastContainer";
import { useSettingsStore } from "./stores/settingsStore";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Escape to navigate back
      if (e.key === "Escape") {
        // handled per-page where needed
      }
      // Ctrl+N / Cmd+N to create
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        window.location.href = "/create";
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/create" element={<PromptFormPage />} />
        <Route path="/edit/:id" element={<PromptFormPage />} />
        <Route path="/detail/:id" element={<PromptDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}
