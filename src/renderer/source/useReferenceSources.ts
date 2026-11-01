import { useEffect, useState } from 'react';
import type { SourceCatalog } from '../../shared/reference-sources';

export function useReferenceSources(id: string) {
  const [catalog, setCatalog] = useState<SourceCatalog | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  useEffect(() => {
    let live = true;
    void window.prezi.sourceCatalog(id).then((result) => {
      if (!live) return;
      if (result.ok) setCatalog(result.value);
      else setError({ id, message: result.error.message });
    });
    return () => {
      live = false;
    };
  }, [id]);
  return {
    files: catalog?.id === id ? catalog.files : null,
    error: error?.id === id ? error.message : null,
  };
}
