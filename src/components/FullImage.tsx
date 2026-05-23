import { useState, useEffect, useRef } from "react";
import { readProjectImage } from "../lib/tauri-api";

interface Props {
  filename: string;
  className?: string;
}

export default function FullImage({ filename, className }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const bytes = await readProjectImage(filename);
        const blob = new Blob([new Uint8Array(bytes)]);
        if (mounted.current) {
          setUrl(URL.createObjectURL(blob));
          setLoading(false);
        }
      } catch {
        if (mounted.current) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted.current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [filename]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 ${className || ""}`}>
        <span className="text-sm text-gray-400 animate-pulse">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 ${className || ""}`}>
        <span className="text-sm text-red-400">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      className={`object-contain w-full h-full ${className || ""}`}
    />
  );
}
