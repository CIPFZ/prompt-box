import { useState, useEffect, useRef } from "react";
import { useThumbnailLoader } from "../hooks/useThumbnailLoader";

interface Props {
  filename: string;
  className?: string;
}

export default function ThumbnailImage({ filename, className }: Props) {
  const { load } = useThumbnailLoader();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(false);

    load(filename).then((src) => {
      if (mounted.current) {
        if (src) setUrl(src);
        else setError(true);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [filename, load]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className || ""}`}>
        <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className || ""}`}>
        <span className="text-xs text-red-400">Error</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      className={`object-cover w-full h-full ${className || ""}`}
      loading="lazy"
    />
  );
}
