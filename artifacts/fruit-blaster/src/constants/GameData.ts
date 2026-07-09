import { FruitType, BombType, LevelConfig } from '../types/GameTypes';

export const FRUIT_DATA: Record<FruitType, { color: string; colorInner: string; score: number; radius: number; probability: number; image?: string }> = {
  'Blueberry': { color: '#5B4FCF', colorInner: '#7A6EE6', score: 10, radius: 25, probability: 15 },
  'Apple': { color: '#FF4444', colorInner: '#FFFDD0', score: 10, radius: 35, probability: 15 },
  'Orange': { color: '#FF8800', colorInner: '#FFAA33', score: 10, radius: 35, probability: 15 },
  'Pear': { color: '#A8C97F', colorInner: '#D4E2BA', score: 10, radius: 35, probability: 10 },
  'Banana': { color: '#FFD700', colorInner: '#FFFDE7', score: 15, radius: 30, probability: 12 },
  'Strawberry': { color: '#FF2D55', colorInner: '#FFA6C9', score: 15, radius: 25, probability: 10 },
  'Kiwi': { color: '#7B8B4A', colorInner: '#8FCE00', score: 15, radius: 28, probability: 8 },
  'Pineapple': { color: '#D4A017', colorInner: '#FFDF00', score: 20, radius: 45, probability: 5 },
  'Watermelon': { color: '#55AA55', colorInner: '#FF3333', score: 20, radius: 50, probability: 6 },
  'Dragon Fruit': { color: '#E91E8C', colorInner: '#FFFFFF', score: 30, radius: 38, probability: 3 },
  'Golden Apple': { color: '#FFD700', colorInner: '#FFFF99', score: 50, radius: 35, probability: 0.8 },
  'Rainbow Mango': { color: 'rainbow', colorInner: '#FFD700', score: 75, radius: 40, probability: 0.2 },

  // ── Bamboo Grove (Zen Mode) — custom hand-painted assets ──
  'Jade Apple':    { color: '#7CCB6A', colorInner: '#E8F7D8', score: 10, radius: 40, probability: 18, image: 'jade-apple.png' },
  'Bamboo Pear':   { color: '#B7D96A', colorInner: '#F1F8DC', score: 10, radius: 42, probability: 16, image: 'bamboo-pear.png' },
  'Emerald Kiwi':  { color: '#5C9E4A', colorInner: '#C7E8A8', score: 15, radius: 32, probability: 16, image: 'emerald-kiwi.png' },
  'Lotus Peach':   { color: '#F3C6D6', colorInner: '#FFF3EE', score: 20, radius: 42, probability: 14, image: 'lotus-peach.png' },
  'Zen Melon':     { color: '#4E9A5A', colorInner: '#DFF3C4', score: 20, radius: 48, probability: 12, image: 'zen-melon.png' },
  'Sacred Plum':   { color: '#8E5AC2', colorInner: '#E2CBF2', score: 30, radius: 38, probability: 10, image: 'sacred-plum.png' },
  'Forest Lime':   { color: '#9ACD4A', colorInner: '#EEF7CF', score: 15, radius: 34, probability: 14, image: 'forest-lime.png' },
};

export const BOMB_DATA: Record<BombType, { color: string; fuseColor: string; radius: number; probability: number; effect: string; image?: string }> = {
  'Normal': { color: '#222', fuseColor: '#FF3300', radius: 35, probability: 80, effect: 'lose_life' },
  'Golden': { color: '#D4AF37', fuseColor: '#FFF', radius: 35, probability: 5, effect: 'freeze_screen' },
  'Frozen': { color: '#4A90E2', fuseColor: '#88CCFF', radius: 35, probability: 10, effect: 'slow_time' },
  'Explosive': { color: '#FF5500', fuseColor: '#FFDD00', radius: 40, probability: 5, effect: 'large_explosion' },
  'Cursed Bamboo Seed': { color: '#3D1E52', fuseColor: '#B87CF0', radius: 42, probability: 100, effect: 'lose_life', image: 'cursed-bamboo-seed.png' },
};

// Fruit pool spawned exclusively inside the Bamboo Grove Zen world.
export const BAMBOO_FRUIT_TYPES: FruitType[] = [
  'Jade Apple', 'Bamboo Pear', 'Emerald Kiwi', 'Lotus Peach', 'Zen Melon', 'Sacred Plum', 'Forest Lime',
];
export const BAMBOO_ASSET_BASE = 'bamboo/';

export const generateLevels = (): LevelConfig[] => {
  const levels: LevelConfig[] = [];
  for (let i = 1; i <= 20; i++) {
    levels.push({
      level: i,
      targetScore: i === 1 ? 100 : Math.floor(100 * Math.pow(1.3, i - 1)),
      speedMultiplier: 1.0 + ((i - 1) * 0.1),
      bombChance: Math.min(0.3, i * 0.015),
      isBossLevel: i % 5 === 0
    });
  }
  return levels;
};

export const LEVELS = generateLevels();
