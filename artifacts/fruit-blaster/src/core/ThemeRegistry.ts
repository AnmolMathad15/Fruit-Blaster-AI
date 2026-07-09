// Central registry describing every themed world's UI skin.
// Gameplay code must never branch on theme directly — it should ask
// ThemeUIManager (see ThemeUIManager.tsx) for the active theme's assets,
// colors, copy, particles and sounds instead.

import type { GameMode } from '../store/gameStore';

export type ThemeId = 'bamboo' | 'moon' | 'crimson' | 'imperial' | 'dojo';

export interface ThemeAssets {
  scoreboard: string;
  result: string;
  pause: string;
  settings: string;
  buttons: {
    play: string;
    pause: string;
    resume: string;
    retry: string;
    settings: string;
    home: string;
    next: string;
    back: string;
    confirm: string;
    cancel: string;
  };
  lifeFull: string;
  lifeEmpty: string;
  coin: string;
  xp: string;
  progressBar: string;
  loadingBar: string;
  comboBanner: string;
}

export interface ThemeConfig {
  id: ThemeId;
  displayName: string;
  /** Base UI color used for text/accents when not using art assets. */
  accent: string;
  accentSoft: string;
  panelTint: string;
  /** Copy shown in the combo banner, indexed by tier (low -> high). */
  comboLabels: [string, string, string, string];
  /** Name of the lives icon concept, used for a11y labels / fallbacks. */
  livesIconName: string;
  timeLabel: string;
  gameOverTitle: string;
  particle: 'leaves' | 'petals' | 'embers' | 'clouds' | 'blossoms';
  soundPrefix: string;
  assets: ThemeAssets;
}

function assetsFor(theme: ThemeId): ThemeAssets {
  const base = `${import.meta.env.BASE_URL}ui/${theme}`;
  return {
    scoreboard: `${base}/scoreboard.png`,
    result: `${base}/result.png`,
    pause: `${base}/pause.png`,
    settings: `${base}/settings.png`,
    buttons: {
      play: `${base}/btn_play.png`,
      pause: `${base}/btn_pause.png`,
      resume: `${base}/btn_resume.png`,
      retry: `${base}/btn_retry.png`,
      settings: `${base}/btn_settings.png`,
      home: `${base}/btn_home.png`,
      next: `${base}/btn_next.png`,
      back: `${base}/btn_back.png`,
      confirm: `${base}/btn_confirm.png`,
      cancel: `${base}/btn_cancel.png`,
    },
    lifeFull: `${base}/life_full.png`,
    lifeEmpty: `${base}/life_empty.png`,
    coin: `${base}/coin.png`,
    xp: `${base}/xp.png`,
    progressBar: `${base}/progress.png`,
    loadingBar: `${base}/loading.png`,
    comboBanner: `${base}/combo.png`,
  };
}

export const THEME_REGISTRY: Record<ThemeId, ThemeConfig> = {
  bamboo: {
    id: 'bamboo',
    displayName: 'Bamboo Grove',
    accent: '#8BC34A',
    accentSoft: '#DCEDC8',
    panelTint: 'rgba(60,90,30,0.35)',
    comboLabels: ['GOOD!', 'AWESOME!', 'UNSTOPPABLE!', 'LEGENDARY!'],
    livesIconName: 'Sacred Leaf',
    timeLabel: '🎋 Zen Time',
    gameOverTitle: 'THE GROVE RESTS',
    particle: 'leaves',
    soundPrefix: 'bamboo',
    assets: assetsFor('bamboo'),
  },
  moon: {
    id: 'moon',
    displayName: 'Moon Shrine',
    accent: '#8C9EFF',
    accentSoft: '#E8EAF6',
    panelTint: 'rgba(60,70,120,0.35)',
    comboLabels: ['GOOD!', 'PRECISION!', 'MASTER!', 'ZEN MASTER!'],
    livesIconName: 'Crescent Moon',
    timeLabel: 'TIME',
    gameOverTitle: 'THE SHRINE FADES',
    particle: 'petals',
    soundPrefix: 'moon',
    assets: assetsFor('moon'),
  },
  crimson: {
    id: 'crimson',
    displayName: 'Crimson Temple',
    accent: '#FF5722',
    accentSoft: '#FFCCBC',
    panelTint: 'rgba(120,30,20,0.35)',
    comboLabels: ['GOOD!', 'BLAZING!', 'INFERNAL!', 'LEGENDARY COMBO!'],
    livesIconName: 'Dragon Flame',
    timeLabel: 'TIME',
    gameOverTitle: 'THE TEMPLE COOLS',
    particle: 'embers',
    soundPrefix: 'crimson',
    assets: assetsFor('crimson'),
  },
  imperial: {
    id: 'imperial',
    displayName: 'Imperial Heaven Palace',
    accent: '#26A69A',
    accentSoft: '#E0F2F1',
    panelTint: 'rgba(20,90,80,0.35)',
    comboLabels: ['GOOD!', 'GOLDEN COMBO!', 'HEAVENLY COMBO!', 'CELESTIAL MASTER COMBO!'],
    livesIconName: 'Imperial Seal',
    timeLabel: 'TIME',
    gameOverTitle: 'THE PALACE GATES CLOSE',
    particle: 'clouds',
    soundPrefix: 'imperial',
    assets: assetsFor('imperial'),
  },
  dojo: {
    id: 'dojo',
    displayName: 'Dojo Gate',
    accent: '#B71C1C',
    accentSoft: '#FFEBEE',
    panelTint: 'rgba(90,40,20,0.35)',
    comboLabels: ['GOOD!', 'SHARP!', 'MASTER STRIKE!', 'GRANDMASTER COMBO!'],
    livesIconName: 'Samurai Crest',
    timeLabel: 'TIME',
    gameOverTitle: 'THE GATE CLOSES',
    particle: 'blossoms',
    soundPrefix: 'dojo',
    assets: assetsFor('dojo'),
  },
};

/**
 * The single source of truth mapping a gameplay mode to its theme.
 * Add new modes here — never sprinkle `mode === '...'` checks elsewhere.
 */
export const THEME_BY_MODE: Record<GameMode, ThemeId> = {
  classic: 'dojo',
  arcade: 'bamboo',
  bamboo: 'bamboo',
  zen: 'moon',
  moon: 'moon',
  challenge: 'crimson',
  survival: 'imperial',
};

export function getThemeForMode(mode: GameMode): ThemeConfig {
  return THEME_REGISTRY[THEME_BY_MODE[mode] ?? 'bamboo'];
}
