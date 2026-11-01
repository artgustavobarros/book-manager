"use client";

import { useEffect, useRef, useState } from "react";

import { isCoverLoaded, markCoverLoaded } from "@/lib/client/preload-covers";

/**
 * Hook compartilhado para gerenciar o estado de download da capa de livro,
 * com cache em memória para evitar flashes de skeleton em capas já vistas.
 */
export function useCoverImage(src: string | null) {
  const [loaded, setLoaded] = useState(() =>
    Boolean(src && isCoverLoaded(src))
  );
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      setError(false);
      return;
    }
    if (isCoverLoaded(src)) {
      setLoaded(true);
      return;
    }
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      markCoverLoaded(src);
      setLoaded(true);
    }
  }, [src]);

  const onLoad = () => {
    if (src) {
      markCoverLoaded(src);
    }
    setLoaded(true);
  };

  const onError = () => {
    setError(true);
  };

  return {
    imgRef,
    loaded,
    error,
    showImage: Boolean(src && !error),
    onLoad,
    onError,
  };
}
