/**
 * Lazy-loading image cache for sprite-based fruit/hazard rendering
 * (used by the Bamboo Grove Zen world). Images are requested on first
 * draw and cached; until loaded, callers should skip drawing that frame.
 */

const cache = new Map<string, HTMLImageElement>();
const loading = new Set<string>();

export function getBambooImage(fileName: string): HTMLImageElement | null {
  const existing = cache.get(fileName);
  if (existing && existing.complete && existing.naturalWidth > 0) return existing;
  if (existing) return null; // still loading

  if (!loading.has(fileName)) {
    loading.add(fileName);
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}bamboo/${fileName}`;
    cache.set(fileName, img);
  }
  return null;
}
