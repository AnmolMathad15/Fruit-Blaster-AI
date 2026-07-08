import { Fruit, Bomb, FruitHalf, Particle } from '../entities/Entities';
import { FruitType, BombType } from '../../types/GameTypes';
import { FRUIT_DATA, BOMB_DATA } from '../../constants/GameData';
import { drawFruit, drawFruitHalf } from './FruitRenderer';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  width: number;
  height: number;
  
  fruits: Fruit[] = [];
  bombs: Bomb[] = [];
  halves: FruitHalf[] = [];
  particles: Particle[] = [];
  
  swordTrail: {x: number, y: number, age: number}[] = [];
  
  gravity: number = 0.3;
  
  spawnTimer: number = 0;
  spawnRate: number = 60; // frames
  
  mode: string;
  speedMultiplier: number = 1;
  bombChance: number = 0;
  
  onScore: (pts: number, x: number, y: number) => void;
  onMiss: () => void;
  onBombHit: () => void;
  playSlice: () => void;
  playBomb: () => void;
  
  lastFingerPos: {x: number, y: number} | null = null;
  
  constructor(
    canvas: HTMLCanvasElement, 
    mode: string, 
    callbacks: {
      onScore: (pts: number, x: number, y: number) => void,
      onMiss: () => void,
      onBombHit: () => void,
      playSlice: () => void,
      playBomb: () => void
    }
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.mode = mode;
    this.onScore = callbacks.onScore;
    this.onMiss = callbacks.onMiss;
    this.onBombHit = callbacks.onBombHit;
    this.playSlice = callbacks.playSlice;
    this.playBomb = callbacks.playBomb;
    
    if (mode === 'zen') {
      this.bombChance = 0.04;   // very few bombs
      this.spawnRate = 55;      // calm, rhythmic pace
    } else if (mode === 'arcade') {
      this.bombChance = 0.18;   // frequent bombs
      this.spawnRate = 28;      // rapid spawns
      this.speedMultiplier = 1.3;
    } else if (mode === 'survival') {
      this.bombChance = 0.08;   // starts light, escalates each wave
      this.spawnRate = 52;
      this.speedMultiplier = 1.0;
    } else {
      // classic / challenge
      this.bombChance = 0.2;
      this.spawnRate = 60;
    }
  }
  
  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  update(dt: number = 1, fingerPos: {x: number, y: number, isPresent: boolean}) {
    // dt represents multiplier for 60fps
    
    // Spawn logic
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEntity();
      this.spawnTimer = this.spawnRate / this.speedMultiplier;
      // Add randomness
      this.spawnTimer += (Math.random() - 0.5) * 20;
    }
    
    // Update entities
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      f.update(dt, this.gravity);
      if (f.pos.y > this.height + 100) {
        if (!f.sliced && this.mode === 'classic') {
          this.onMiss();
        }
        this.fruits.splice(i, 1);
      }
    }
    
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.update(dt, this.gravity);
      if (b.pos.y > this.height + 100) {
        this.bombs.splice(i, 1);
      }
    }
    
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.update(dt, this.gravity);
      if (h.pos.y > this.height + 100) {
        this.halves.splice(i, 1);
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    
    // Update sword trail
    for (let i = 0; i < this.swordTrail.length; i++) {
      this.swordTrail[i].age += dt;
    }
    this.swordTrail = this.swordTrail.filter(t => t.age < 15); // max 15 frames
    
    // Collision detection
    if (fingerPos.isPresent) {
      this.swordTrail.unshift({ x: fingerPos.x, y: fingerPos.y, age: 0 });
      
      if (this.lastFingerPos) {
        // Line collision
        const p1 = this.lastFingerPos;
        const p2 = fingerPos;
        
        // Fruits
        for (let i = this.fruits.length - 1; i >= 0; i--) {
          const f = this.fruits[i];
          if (!f.sliced && this.lineCircleCollide(p1, p2, f.pos, f.radius)) {
            this.sliceFruit(f);
            this.fruits.splice(i, 1);
          }
        }
        
        // Bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
          const b = this.bombs[i];
          if (this.lineCircleCollide(p1, p2, b.pos, b.radius)) {
            this.hitBomb(b);
            this.bombs.splice(i, 1);
          }
        }
      }
      this.lastFingerPos = { x: fingerPos.x, y: fingerPos.y };
    } else {
      this.lastFingerPos = null;
    }
  }
  
  spawnEntity() {
    const isBomb = Math.random() < this.bombChance;
    const startX = this.width * 0.2 + Math.random() * (this.width * 0.6);
    const startY = this.height + 50;
    
    // Aim towards top centerish
    const targetX = this.width / 2 + (Math.random() - 0.5) * (this.width * 0.4);
    const targetY = this.height * 0.1;
    
    // Simple projectile physics estimation
    const timeToPeak = 60; // approx 1 sec
    const vy = - (startY - targetY + 0.5 * this.gravity * timeToPeak * timeToPeak) / timeToPeak;
    const vx = (targetX - startX) / timeToPeak;
    
    if (isBomb) {
      const type = 'Normal'; // Could add weighted random for bomb types
      this.bombs.push(new Bomb(startX, startY, vx, vy, type));
    } else {
      // Pick fruit type by probability
      const rand = Math.random() * 100;
      let cumProb = 0;
      let type: FruitType = 'Apple';
      for (const [k, v] of Object.entries(FRUIT_DATA)) {
        cumProb += v.probability;
        if (rand <= cumProb) {
          type = k as FruitType;
          break;
        }
      }
      this.fruits.push(new Fruit(startX, startY, vx, vy, type));
    }
  }
  
  sliceFruit(f: Fruit) {
    f.sliced = true;
    this.playSlice();
    this.onScore(f.score, f.pos.x, f.pos.y);
    
    // Create halves
    const spread = 2;
    this.halves.push(new FruitHalf(f.pos.x - 10, f.pos.y, f.vel.x - spread, f.vel.y, f.type, true));
    this.halves.push(new FruitHalf(f.pos.x + 10, f.pos.y, f.vel.x + spread, f.vel.y, f.type, false));
    
    // Create particles
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle({
        x: f.pos.x, y: f.pos.y,
        vx: f.vel.x + (Math.random() - 0.5) * 10,
        vy: f.vel.y + (Math.random() - 0.5) * 10,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color: f.color,
        size: 2 + Math.random() * 4,
        type: 'juice'
      }));
    }
  }
  
  hitBomb(b: Bomb) {
    this.playBomb();
    this.onBombHit();
    
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle({
        x: b.pos.x, y: b.pos.y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        color: ['#ff0000', '#ff8800', '#444444', '#000000'][Math.floor(Math.random()*4)],
        size: 5 + Math.random() * 15,
        type: 'smoke'
      }));
    }
  }
  
  lineCircleCollide(p1: {x:number, y:number}, p2: {x:number, y:number}, c: {x:number, y:number}, r: number) {
    const ac = {x: c.x - p1.x, y: c.y - p1.y};
    const ab = {x: p2.x - p1.x, y: p2.y - p1.y};
    const abSq = ab.x * ab.x + ab.y * ab.y;
    if (abSq === 0) {
       const dx = c.x - p1.x;
       const dy = c.y - p1.y;
       return dx * dx + dy * dy <= r * r;
    }
    let t = (ac.x * ab.x + ac.y * ab.y) / abSq;
    t = Math.max(0, Math.min(1, t));
    const h = {x: p1.x + t * ab.x, y: p1.y + t * ab.y};
    const dx = h.x - c.x;
    const dy = h.y - c.y;
    return dx * dx + dy * dy <= r * r;
  }
  
  draw(skinColors: {base: string, tip: string, particleType: string}) {
    const { ctx, width, height } = this;
    // NOTE: caller (GameCanvas) owns the clear + video draw.
    // Do NOT clearRect here — it would wipe the webcam background.
    
    // Draw halves
    this.halves.forEach(h => {
      ctx.save();
      ctx.translate(h.pos.x, h.pos.y);
      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(3, h.radius * 0.6, h.radius * 0.75, h.radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(h.rotation);
      drawFruitHalf(ctx, h.type, h.radius, h.isLeft);
      ctx.restore();
    });

    // Draw fruits
    this.fruits.forEach(f => {
      ctx.save();
      ctx.translate(f.pos.x, f.pos.y);
      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(4, f.radius * 0.72, f.radius * 0.78, f.radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(f.rotation);
      drawFruit(ctx, f.type, f.radius);
      ctx.restore();
    });
    
    // Draw bombs
    this.bombs.forEach(b => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      ctx.rotate(b.rotation);
      
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-b.radius*0.3, -b.radius*0.3, b.radius*0.1, 0, 0, b.radius);
      grad.addColorStop(0, '#666');
      grad.addColorStop(1, b.color);
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Fuse
      ctx.beginPath();
      ctx.moveTo(0, -b.radius);
      ctx.quadraticCurveTo(b.radius*0.5, -b.radius*1.5, b.radius*0.8, -b.radius*1.2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#a67c00';
      ctx.stroke();
      
      // Spark
      ctx.fillStyle = b.fuseColor;
      ctx.beginPath();
      ctx.arc(b.radius*0.8 + (Math.random()-0.5)*3, -b.radius*1.2 + (Math.random()-0.5)*3, 4 + Math.random()*3, 0, Math.PI*2);
      ctx.fill();
      
      ctx.restore();
    });
    
    // Draw particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(p.rotation);
      
      if (p.type === 'juice' || p.type === 'smoke') {
        ctx.fillStyle = p.color as string;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color as string;
        ctx.fillRect(-p.size/2, -p.size, p.size, p.size*2);
      }
      ctx.restore();
    });
    
    // Draw Sword Trail
    if (this.swordTrail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = skinColors.base;
      
      ctx.beginPath();
      ctx.moveTo(this.swordTrail[0].x, this.swordTrail[0].y);
      for (let i = 1; i < this.swordTrail.length; i++) {
        ctx.lineTo(this.swordTrail[i].x, this.swordTrail[i].y);
      }
      
      const grad = ctx.createLinearGradient(
        this.swordTrail[0].x, this.swordTrail[0].y,
        this.swordTrail[this.swordTrail.length-1].x, this.swordTrail[this.swordTrail.length-1].y
      );
      grad.addColorStop(0, skinColors.tip);
      grad.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = 8;
      ctx.stroke();
      
      // Core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.restore();
      
      // Trail particles
      if (Math.random() < 0.5 && this.swordTrail.length > 0) {
        this.particles.push(new Particle({
          x: this.swordTrail[0].x,
          y: this.swordTrail[0].y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 10 + Math.random() * 10,
          maxLife: 20,
          color: skinColors.tip,
          size: 1 + Math.random() * 3,
          type: 'juice'
        }));
      }
    }
  }
}
