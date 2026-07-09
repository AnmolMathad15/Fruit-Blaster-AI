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
  | 'Jade Apple' | 'Bamboo Pear' | 'Emerald Kiwi' | 'Lotus Peach' | 'Zen Melon' | 'Sacred Plum' | 'Forest Lime'
  | 'Celestial Apple' | 'Spirit Pear' | 'Lunar Kiwi' | 'Moon Peach' | 'Moon Mandarin' | 'Silver Melon' | 'Luna Plum' | 'Moon Lime'
  | 'Infernal Apple' | 'Infernal Banana' | 'Infernal Grape' | 'Infernal Papaya' | 'Infernal Strawberry' | 'Infernal Tomato' | 'Infernal Watermelon' | 'Infernal Pineapple'
  | 'Imperial Apple' | 'Imperial Banana' | 'Imperial Cherry' | 'Imperial Raspberry' | 'Imperial Gooseberry' | 'Imperial Grapefruit' | 'Imperial Sugarcane' | 'Imperial Jackfruit' | 'Imperial Durian';
export type BombType = 'Normal' | 'Golden' | 'Frozen' | 'Explosive' | 'Cursed Bamboo Seed' | 'Cursed Eclipse Orb' | 'Infernal Dragon Core' | "Emperor's Judgment Orb";

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
