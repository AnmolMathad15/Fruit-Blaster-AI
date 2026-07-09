import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { getThemeForMode, THEME_REGISTRY, type ThemeConfig, type ThemeId } from './ThemeRegistry';

interface ThemeUIContextValue {
  theme: ThemeConfig;
}

const ThemeUIContext = createContext<ThemeUIContextValue | null>(null);

/** Preloads every image for a theme and keeps a small in-memory cache so an
 *  already-visited theme reuses decoded images instead of refetching. */
const loadedThemes = new Set<ThemeId>();

function preloadTheme(theme: ThemeConfig) {
  if (loadedThemes.has(theme.id)) return;
  const urls = [
    theme.assets.scoreboard,
    theme.assets.result,
    theme.assets.pause,
    theme.assets.settings,
    theme.assets.lifeFull,
    theme.assets.lifeEmpty,
    theme.assets.coin,
    theme.assets.xp,
    theme.assets.progressBar,
    theme.assets.loadingBar,
    theme.assets.comboBanner,
    ...Object.values(theme.assets.buttons),
  ];
  urls.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
  loadedThemes.add(theme.id);
}

/**
 * ThemeUIManager is the ONLY place in the app that knows how a `mode` maps
 * to visual theme. Every screen/component reads `useTheme()` and renders
 * whatever the active theme's config says — no `if (mode === 'bamboo')`
 * branches should exist outside this file and ThemeRegistry.ts.
 */
export function ThemeUIProvider({ children }: { children: ReactNode }) {
  const mode = useGameStore((s) => s.mode);
  const theme = useMemo(() => getThemeForMode(mode), [mode]);
  const activeThemeRef = useRef<ThemeId>(theme.id);

  useEffect(() => {
    preloadTheme(theme);
    activeThemeRef.current = theme.id;
    // Only the active theme's images are kept warm; others are simply never
    // fetched until their mode is entered, which keeps memory bounded
    // without needing manual teardown (the browser cache handles eviction).
  }, [theme]);

  const value = useMemo(() => ({ theme }), [theme]);

  return <ThemeUIContext.Provider value={value}>{children}</ThemeUIContext.Provider>;
}

export function useTheme(): ThemeConfig {
  const ctx = useContext(ThemeUIContext);
  if (!ctx) {
    // Fallback for screens rendered outside gameplay (menus) — default look.
    return THEME_REGISTRY.bamboo;
  }
  return ctx.theme;
}

export function comboLabelFor(theme: ThemeConfig, combo: number): string {
  if (combo >= 20) return theme.comboLabels[3];
  if (combo >= 10) return theme.comboLabels[2];
  if (combo >= 5) return theme.comboLabels[1];
  return theme.comboLabels[0];
}
