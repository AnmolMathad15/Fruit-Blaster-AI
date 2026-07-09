/**
 * Lazy-loading image cache for sprite-based fruit/hazard rendering
 * (used by the Bamboo Grove Zen world). Images are requested on first
 * draw and cached; until loaded, callers should skip drawing that frame.
 */

const cache = new Map<string, HTMLImageElement>();
const loading = new Set<string>();

export function getBambooImage(fileName: string): HTMLImageElement | null {
  return getSpriteImage('bamboo', fileName);
}

/**
 * Same lazy-loading cache, generalized to any asset folder (used by the
 * Moon Shrine world for its custom celestial fruit/hazard/weapon sprites).
 */
export function getSpriteImage(folder: string, fileName: string): HTMLImageElement | null {
  const key = `${folder}/${fileName}`;
  const existing = cache.get(key);
  if (existing && existing.complete && existing.naturalWidth > 0) return existing;
  if (existing) return null; // still loading

  if (!loading.has(key)) {
    loading.add(key);
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}${folder}/${fileName}`;
    cache.set(key, img);
  }
  return null;
}

export function getMoonImage(fileName: string): HTMLImageElement | null {
  return getSpriteImage('moon', fileName);
}

export function getCrimsonImage(fileName: string): HTMLImageElement | null {
  return getSpriteImage('crimson', fileName);
}

export function getImperialImage(fileName: string): HTMLImageElement | null {
  return getSpriteImage('imperial', fileName);
}

export function getDojoImage(fileName: string): HTMLImageElement | null {
  return getSpriteImage('dojo', fileName);
}
