import { useState, useEffect, useRef } from "react";
import { useThumbnailLoader } from "../hooks/useThumbnailLoader";

interface Props {
  filename: string;
  show: boolean;
}

export default function ImagePreviewPopper({ filename, show }: Props) {
  const { load } = useThumbnailLoader();
  const [url, setUrl] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    if (!show || !filename) return;
    mounted.current = true;

    load(filename).then((src) => {
      if (mounted.current) setUrl(src);
    });

    return () => {
      mounted.current = false;
    };
  }, [show, filename, load]);

  if (!show || !url) return null;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <img
          src={url}
          className="max-w-[320px] max-h-[400px] object-contain"
        />
      </div>
    </div>
  );
}
