import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThumbnailImage from "./ThumbnailImage";
import ImagePreviewPopper from "./ImagePreviewPopper";
import type { Prompt } from "../types";

interface Props {
  item: Prompt;
  onTagClick: (tag: string) => void;
}

export default function GalleryCard({ item, onTagClick }: Props) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const tags = item.tags
    ? item.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  function handleMouseEnter() {
    timer.current = setTimeout(() => setHover(true), 300);
  }

  function handleMouseLeave() {
    if (timer.current) clearTimeout(timer.current);
    setHover(false);
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer border border-gray-100 overflow-hidden transition-all duration-200 relative"
      onClick={() => navigate(`/detail/${item.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ImagePreviewPopper filename={item.image_path} show={hover} />

      <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
        <ThumbnailImage
          filename={item.image_path}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-800 truncate">{item.title}</h3>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-gray-400">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
