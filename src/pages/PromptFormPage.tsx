import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { createPrompt, updatePrompt, getPromptById, readAbsoluteImage } from "../lib/tauri-api";
import { usePromptStore } from "../stores/promptStore";
import { useTagStore } from "../stores/tagStore";
import { useI18nStore } from "../stores/i18nStore";
import type { Prompt } from "../types";
import TopBar from "../components/TopBar";
import TagInput from "../components/TagInput";

export default function PromptFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { refresh, loadTags } = usePromptStore();
  const { allTags, load: loadTagStore } = useTagStore();
  const { tt } = useI18nStore();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [positive, setPositive] = useState("");
  const [negative, setNegative] = useState("");
  const [filePath, setFilePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    loadTagStore();
    if (isEdit && id) {
      setLoadingEdit(true);
      getPromptById(Number(id))
        .then((p: Prompt) => {
          setTitle(p.title);
          setPositive(p.positive_prompt || "");
          setNegative(p.negative_prompt || "");
          setTags(p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [id, isEdit]);

  async function handleSelectImage() {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (file) {
      const path = file as string;
      setFilePath(path);
      try {
        const bytes = await readAbsoluteImage(path);
        const blob = new Blob([new Uint8Array(bytes)]);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (e) {
        alert(tt("previewFailed") + e);
      }
    }
  }

  async function handleSave() {
    if (isEdit) {
      // Edit: only metadata
      if (!title) return alert(tt("titleRequired"));
      setSaving(true);
      try {
        await updatePrompt({
          id: Number(id),
          title,
          positive_prompt: positive,
          negative_prompt: negative,
          tags: tags.join(","),
        });
        navigate(`/detail/${id}`);
      } catch (e) {
        alert(tt("saveFailed") + e);
      } finally {
        setSaving(false);
      }
    } else {
      // Create
      if (!filePath || !title) return alert(tt("imageRequired"));
      setSaving(true);
      try {
        await createPrompt({
          title,
          positive_prompt: positive,
          negative_prompt: negative,
          tags: tags.join(","),
          source_path: filePath,
        });
        loadTags();
        refresh();
        navigate("/");
      } catch (e) {
        alert(tt("saveFailed") + e);
      } finally {
        setSaving(false);
      }
    }
  }

  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <span className="text-gray-400">{tt("loadingRecord")}</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image picker */}
        <div className="w-1/2 bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-800">
          {!previewUrl ? (
            <button
              onClick={handleSelectImage}
              className="flex flex-col items-center gap-3 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer bg-white dark:bg-gray-800 p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400"
            >
              <span className="text-5xl">+</span>
              <span className="text-sm font-medium">{isEdit ? tt("replaceImage") : tt("clickUpload")}</span>
            </button>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={previewUrl}
                className="max-w-full max-h-full object-contain shadow-lg rounded-xl"
              />
              <button
                onClick={handleSelectImage}
                className="absolute bottom-4 bg-white/90 hover:bg-white px-4 py-2 rounded-full text-sm shadow-md text-gray-600 font-medium transition-colors"
              >
                {isEdit ? tt("changeImage") : tt("reselect")}
              </button>
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="w-1/2 overflow-y-auto p-8 space-y-5">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            {isEdit ? tt("editRecord") : tt("createNew")}
          </h2>

          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{tt("title")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tt("enterTitle")}
              className="w-full mt-1 p-2 border-b border-gray-200 dark:border-gray-700 dark:bg-transparent dark:text-gray-200 focus:border-blue-500 outline-none text-lg font-medium transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
              {tt("tags")}
            </label>
            <TagInput
              value={tags}
              onChange={setTags}
              allTags={allTags}
              allowCreate
              placeholder={tt("enterTags")}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {tt("positivePrompt")}
            </label>
            <textarea
              value={positive}
              onChange={(e) => setPositive(e.target.value)}
              rows={6}
              className="w-full mt-1 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-200 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder={tt("enterPositive")}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {tt("negativePrompt")}
            </label>
            <textarea
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              rows={4}
              className="w-full mt-1 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-200 text-sm font-mono resize-none focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all"
              placeholder={tt("enterNegative")}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-all active:scale-[0.98] disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? tt("saving") : isEdit ? tt("updateRecord") : tt("saveRecord")}
          </button>
        </div>
      </div>
    </div>
  );
}
