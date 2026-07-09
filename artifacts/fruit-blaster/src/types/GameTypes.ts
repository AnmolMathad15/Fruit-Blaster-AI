export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export type FruitType = 'Apple' | 'Orange' | 'Banana' | 'Watermelon' | 'Kiwi' | 'Pineapple' | 'Pear' | 'Dragon Fruit' | 'Strawberry' | 'Blueberry' | 'Golden Apple' | 'Rainbow Mango'
  | 'Jade Apple' | 'Bamboo Pear' | 'Emerald Kiwi' | 'Lotus Peach' | 'Zen Melon' | 'Sacred Plum' | 'Forest Lime';
export type BombType = 'Normal' | 'Golden' | 'Frozen' | 'Explosive' | 'Cursed Bamboo Seed';

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string | string[];
  size: number;
  type: 'juice' | 'sparkle' | 'confetti' | 'smoke' | 'fire' | 'star' | 'ember' | 'frost' | 'text';
  text?: string;
}

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface LevelConfig {
  level: number;
  targetScore: number;
  speedMultiplier: number;
  bombChance: number; // 0-1
  isBossLevel: boolean;
}
