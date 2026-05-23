import { useState, useRef, useEffect, useMemo } from "react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  allTags: string[];
  allowCreate?: boolean;
  placeholder?: string;
}

export default function TagInput({
  value,
  onChange,
  allTags,
  allowCreate = true,
  placeholder = "输入标签...",
}: Props) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = input.toLowerCase().trim();
    return allTags.filter(
      (t) => !value.includes(t) && t.toLowerCase().includes(q)
    );
  }, [input, allTags, value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function addTag(tag: string) {
    if (!value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeTag(index: number) {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  }

  function handleKeydown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = input.trim();
      if (!val) return;
      const match = suggestions.find(
        (t) => t.toLowerCase() === val.toLowerCase()
      );
      addTag(match || val);
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg bg-white min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-sm font-medium flex items-center gap-1 select-none"
          >
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="hover:text-blue-800 text-blue-400"
            >
              x
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeydown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[60px] outline-none text-sm bg-transparent"
        />
      </div>

      {showDropdown && (suggestions.length > 0 || (input && allowCreate)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          {suggestions.map((tag) => (
            <div
              key={tag}
              onClick={() => addTag(tag)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
            >
              {tag}
            </div>
          ))}
          {input && !suggestions.includes(input) && allowCreate && (
            <div
              onClick={() => addTag(input.trim())}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-t font-medium"
            >
              + 创建 "{input.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
