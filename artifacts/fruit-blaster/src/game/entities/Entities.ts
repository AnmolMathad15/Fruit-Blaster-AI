import { FruitType, BombType, Vector2, Circle } from '../../types/GameTypes';
import { FRUIT_DATA, BOMB_DATA } from '../../constants/GameData';

export class Entity {
  id: string;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  rotation: number;
  rotVel: number;
  markedForDeletion: boolean = false;

  constructor(x: number, y: number, vx: number, vy: number, radius: number) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.pos = { x, y };
    this.vel = { x: vx, y: vy };
    this.radius = radius;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotVel = (Math.random() - 0.5) * 0.2;
  }

  update(dt: number, gravity: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.vel.y += gravity * dt;
    this.rotation += this.rotVel * dt;
  }
}

export class Fruit extends Entity {
  type: FruitType;
  color: string;
  colorInner: string;
  score: number;
  sliced: boolean = false;

  constructor(x: number, y: number, vx: number, vy: number, type: FruitType) {
    super(x, y, vx, vy, FRUIT_DATA[type].radius);
    this.type = type;
    this.color = FRUIT_DATA[type].color;
    this.colorInner = FRUIT_DATA[type].colorInner;
    this.score = FRUIT_DATA[type].score;
  }
}

export class FruitHalf extends Entity {
  type: FruitType;
  color: string;
  colorInner: string;
  isLeft: boolean;

  constructor(x: number, y: number, vx: number, vy: number, type: FruitType, isLeft: boolean) {
    super(x, y, vx, vy, FRUIT_DATA[type].radius);
    this.type = type;
    this.color = FRUIT_DATA[type].color;
    this.colorInner = FRUIT_DATA[type].colorInner;
    this.isLeft = isLeft;
  }
}

export class Bomb extends Entity {
  type: BombType;
  color: string;
  fuseColor: string;
  effect: string;

  constructor(x: number, y: number, vx: number, vy: number, type: BombType) {
    super(x, y, vx, vy, BOMB_DATA[type].radius);
    this.type = type;
    this.color = BOMB_DATA[type].color;
    this.fuseColor = BOMB_DATA[type].fuseColor;
    this.effect = BOMB_DATA[type].effect;
  }
}

export class Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  color: string | string[];
  size: number;
  type: string;
  text?: string;
  rotation: number;
  rotVel: number;

  constructor(config: any) {
    this.pos = { x: config.x, y: config.y };
    this.vel = { x: config.vx, y: config.vy };
    this.life = config.life;
    this.maxLife = config.maxLife;
    this.color = config.color;
    this.size = config.size;
    this.type = config.type;
    this.text = config.text;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotVel = (Math.random() - 0.5) * 0.4;
  }

  update(dt: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    if (this.type === 'juice' || this.type === 'confetti') {
      this.vel.y += 0.2 * dt; // gravity
    }
    this.rotation += this.rotVel * dt;
    this.life -= dt;
  }
}
