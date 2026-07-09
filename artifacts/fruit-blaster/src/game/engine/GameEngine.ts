import { Fruit, Bomb, FruitHalf, Particle } from '../entities/Entities';
import { FruitType, BombType } from '../../types/GameTypes';
import { FRUIT_DATA, BOMB_DATA, BAMBOO_FRUIT_TYPES, MOON_FRUIT_TYPES, CRIMSON_FRUIT_TYPES, IMPERIAL_FRUIT_TYPES, DOJO_FRUIT_TYPES } from '../../constants/GameData';
import { drawFruit, drawFruitHalf, drawBambooSprite, drawMoonSprite, drawCrimsonSprite, drawImperialSprite, drawDojoSprite } from './FruitRenderer';
import { getBambooImage, getMoonImage, getCrimsonImage, getImperialImage, getDojoImage } from '../../utils/imageCache';

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
  
  onScore: (pts: number, x: number, y: number, perfect: boolean) => void;
  onMiss: () => void;
  onBombHit: () => void;
  playSlice: () => void;
  playBomb: () => void;
  
  lastFingerPos: {x: number, y: number} | null = null;

  // Moon Shrine — Survival Mode: difficulty escalates every 30s, maxing at 5min.
  survivalSeconds: number = 0;
  moonBlessingActive: boolean = false;
  baseSpawnRate: number = 60;
  baseBombChance: number = 0;
  baseSpeedMultiplier: number = 1;
  
  constructor(
    canvas: HTMLCanvasElement, 
    mode: string, 
    callbacks: {
      onScore: (pts: number, x: number, y: number, perfect: boolean) => void,
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
      this.bombChance = 0;
      this.spawnRate = 45;
    } else if (mode === 'arcade') {
      this.bombChance = 0.15;
      this.spawnRate = 30;
      this.speedMultiplier = 1.2;
    } else if (mode === 'survival') {
      // Imperial Heaven Palace — the hardest, most intense world: ~40-50% more
      // fruits than the Crimson Temple, heavier bomb frequency, and a difficulty
      // ramp every 30-45s per the zone's design brief.
      this.bombChance = 0.5;
      this.spawnRate = 26;
      this.speedMultiplier = 1.25;
      this.baseBombChance = 0.5;
      this.baseSpawnRate = 26;
      this.baseSpeedMultiplier = 1.25;
    } else if (mode === 'classic') {
      // Dojo Gate — the game's default/classic zone: fast, generous fruit
      // waves (4-8 fruits) with the Cursed Oni Mask appearing far less often
      // than other worlds' hazards (~1 in 8-15 waves) per the zone's
      // discipline-over-recklessness design brief.
      this.bombChance = 0.09;
      this.spawnRate = 24;
      this.speedMultiplier = 1.05;
    } else if (mode === 'bamboo') {
      // Bamboo Grove — Zen Mode: calm, balanced, no escalating difficulty.
      this.bombChance = 0.1;
      this.spawnRate = 28;
    } else if (mode === 'moon') {
      // Moon Shrine — Survival Mode: starts calm, ramps up every 30s, maxes at 5min.
      this.bombChance = 0.14;
      this.spawnRate = 45;
      this.speedMultiplier = 1;
      this.baseBombChance = 0.14;
      this.baseSpawnRate = 45;
      this.baseSpeedMultiplier = 1;
    } else if (mode === 'challenge') {
      // Crimson Temple — Challenge Mode: ~40% faster spawns and a heavy, relentless
      // bomb presence — the Infernal Dragon Core should be a constant threat.
      this.bombChance = 0.45;
      this.spawnRate = 36;
      this.speedMultiplier = 1.15;
    } else {
      this.bombChance = 0.2;
      this.spawnRate = 60;
    }
  }

  /** Moon Shrine difficulty ramp: every 30s raise speed/spawn/bomb frequency, capped at 5 minutes. */
  updateMoonDifficulty(dt: number) {
    this.survivalSeconds += dt / 60;
    const tier = Math.min(10, Math.floor(this.survivalSeconds / 30)); // 0..10, maxed at 300s
    this.speedMultiplier = this.baseSpeedMultiplier + tier * 0.12;
    this.spawnRate = Math.max(14, this.baseSpawnRate - tier * 3);
    this.bombChance = Math.min(0.4, this.baseBombChance + tier * 0.02);
  }

  /** Imperial Heaven Palace difficulty ramp: every ~35s, gradually push speed/spawn/bombs higher — the hardest world in the game. */
  updateImperialDifficulty(dt: number) {
    this.survivalSeconds += dt / 60;
    const tier = Math.min(10, Math.floor(this.survivalSeconds / 35)); // 0..10
    this.speedMultiplier = this.baseSpeedMultiplier + tier * 0.1;
    this.spawnRate = Math.max(16, this.baseSpawnRate - tier * 1.6);
    this.bombChance = Math.min(0.65, this.baseBombChance + tier * 0.015);
  }
  
  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  update(dt: number = 1, fingerPos: {x: number, y: number, isPresent: boolean}) {
    // dt represents multiplier for 60fps

    if (this.mode === 'moon') this.updateMoonDifficulty(dt);
    if (this.mode === 'survival') this.updateImperialDifficulty(dt);
    
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
        if (!f.sliced && (this.mode === 'classic' || this.mode === 'survival')) {
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
    // Dojo Gate: never allow more than one Cursed Oni Mask on screen at once,
    // per the zone's "never create impossible situations" fairness rule.
    const isBomb = this.mode === 'classic'
      ? (this.bombs.length === 0 && Math.random() < this.bombChance)
      : Math.random() < this.bombChance;
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
      const type: BombType = this.mode === 'bamboo' ? 'Cursed Bamboo Seed'
        : this.mode === 'moon' ? 'Cursed Eclipse Orb'
        : this.mode === 'challenge' ? 'Infernal Dragon Core'
        : this.mode === 'survival' ? "Emperor's Judgment Orb"
        : this.mode === 'classic' ? 'Cursed Oni Mask'
        : 'Normal';
      // Crimson Temple / Imperial Palace: bombs frequently arrive in bursts of
      // 2-3 (Imperial even reaching double/triple Judgment Orb waves) rather
      // than one at a time, keeping constant pressure on the player.
      const bombCount = this.mode === 'challenge'
        ? (Math.random() < 0.3 ? 3 : Math.random() < 0.55 ? 2 : 1)
        : this.mode === 'survival'
        ? (Math.random() < 0.4 ? 3 : Math.random() < 0.65 ? 2 : 1)
        : 1;
      for (let i = 0; i < bombCount; i++) {
        const jitterX = startX + (Math.random() - 0.5) * 140 * i;
        const jitterVx = vx + (Math.random() - 0.5) * 2.5;
        this.bombs.push(new Bomb(jitterX, startY, jitterVx, vy, type));
      }
    } else if (this.mode === 'survival') {
      // Imperial Heaven Palace spawns exclusively from our nine legendary fruits,
      // weighted by probability, with large multi-fruit waves (2-5, occasionally
      // more) to satisfy the "40-50% more fruits than Crimson Temple" design goal.
      const pool = IMPERIAL_FRUIT_TYPES.map(t => [t, FRUIT_DATA[t]] as const);
      const totalProb = pool.reduce((sum, [, v]) => sum + v.probability, 0);
      const roll = Math.random();
      const waveSize = roll < 0.2 ? 5 : roll < 0.45 ? 4 : roll < 0.7 ? 3 : roll < 0.9 ? 2 : 1;
      for (let i = 0; i < waveSize; i++) {
        const rand = Math.random() * totalProb;
        let cumProb = 0;
        let type: FruitType = IMPERIAL_FRUIT_TYPES[0];
        for (const [k, v] of pool) {
          cumProb += v.probability;
          if (rand <= cumProb) { type = k; break; }
        }
        const jitterX = startX + (Math.random() - 0.5) * 130 * i;
        const jitterVx = vx + (Math.random() - 0.5) * 2.2;
        this.fruits.push(new Fruit(jitterX, startY, jitterVx, vy, type));
      }
    } else if (this.mode === 'challenge') {
      // Crimson Temple spawns exclusively from our eight infernal fruits, weighted
      // by probability, and frequently launches multi-fruit waves (2-4 at once)
      // to keep the screen feeling alive per the zone's design brief.
      const pool = CRIMSON_FRUIT_TYPES.map(t => [t, FRUIT_DATA[t]] as const);
      const totalProb = pool.reduce((sum, [, v]) => sum + v.probability, 0);
      const waveSize = Math.random() < 0.35 ? (Math.random() < 0.4 ? 4 : 3) : (Math.random() < 0.5 ? 2 : 1);
      for (let i = 0; i < waveSize; i++) {
        const rand = Math.random() * totalProb;
        let cumProb = 0;
        let type: FruitType = CRIMSON_FRUIT_TYPES[0];
        for (const [k, v] of pool) {
          cumProb += v.probability;
          if (rand <= cumProb) { type = k; break; }
        }
        const jitterX = startX + (Math.random() - 0.5) * 120 * i;
        const jitterVx = vx + (Math.random() - 0.5) * 2;
        this.fruits.push(new Fruit(jitterX, startY, jitterVx, vy, type));
      }
    } else if (this.mode === 'classic') {
      // Dojo Gate spawns exclusively from our nine celestial fruits, weighted by
      // probability, in generous waves (4-8 fruits) with almost no idle time,
      // per the zone's "nonstop, rewarding" design brief.
      const pool = DOJO_FRUIT_TYPES.map(t => [t, FRUIT_DATA[t]] as const);
      const totalProb = pool.reduce((sum, [, v]) => sum + v.probability, 0);
      const roll = Math.random();
      const waveSize = roll < 0.15 ? 8 : roll < 0.35 ? 6 : roll < 0.6 ? 5 : roll < 0.85 ? 4 : 3;
      for (let i = 0; i < waveSize; i++) {
        const rand = Math.random() * totalProb;
        let cumProb = 0;
        let type: FruitType = DOJO_FRUIT_TYPES[0];
        for (const [k, v] of pool) {
          cumProb += v.probability;
          if (rand <= cumProb) { type = k; break; }
        }
        const jitterX = startX + (Math.random() - 0.5) * 130 * i;
        const jitterVx = vx + (Math.random() - 0.5) * 2;
        this.fruits.push(new Fruit(jitterX, startY, jitterVx, vy, type));
      }
    } else if (this.mode === 'bamboo') {
      // Bamboo Grove spawns exclusively from our seven custom fruits.
      const type = BAMBOO_FRUIT_TYPES[Math.floor(Math.random() * BAMBOO_FRUIT_TYPES.length)];
      this.fruits.push(new Fruit(startX, startY, vx, vy, type));
    } else if (this.mode === 'moon') {
      // Moon Shrine spawns exclusively from our celestial fruits (weighted by probability).
      const pool = MOON_FRUIT_TYPES.map(t => [t, FRUIT_DATA[t]] as const);
      const totalProb = pool.reduce((sum, [, v]) => sum + v.probability, 0);
      const rand = Math.random() * totalProb;
      let cumProb = 0;
      let type: FruitType = MOON_FRUIT_TYPES[0];
      for (const [k, v] of pool) {
        cumProb += v.probability;
        if (rand <= cumProb) { type = k; break; }
      }
      this.fruits.push(new Fruit(startX, startY, vx, vy, type));
    } else {
      // Pick fruit type by probability
      const pool = Object.entries(FRUIT_DATA).filter(([k]) => !BAMBOO_FRUIT_TYPES.includes(k as FruitType) && !MOON_FRUIT_TYPES.includes(k as FruitType) && !CRIMSON_FRUIT_TYPES.includes(k as FruitType) && !IMPERIAL_FRUIT_TYPES.includes(k as FruitType) && !DOJO_FRUIT_TYPES.includes(k as FruitType) && k !== 'Lunar Kiwi');
      const totalProb = pool.reduce((sum, [, v]) => sum + v.probability, 0);
      const rand = Math.random() * totalProb;
      let cumProb = 0;
      let type: FruitType = 'Apple';
      for (const [k, v] of pool) {
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

    // Create halves
    const spread = 2;
    this.halves.push(new FruitHalf(f.pos.x - 10, f.pos.y, f.vel.x - spread, f.vel.y, f.type, true));
    this.halves.push(new FruitHalf(f.pos.x + 10, f.pos.y, f.vel.x + spread, f.vel.y, f.type, false));

    if (this.mode === 'moon') {
      // "Clean" / "Perfect" is based on how fast the actual sword slash moved through
      // this point (swordTrail = recent fingertip history), not the fruit's own velocity.
      let slashSpeed = 0;
      if (this.swordTrail.length > 1) {
        const tip = this.swordTrail[0];
        const prev = this.swordTrail[Math.min(4, this.swordTrail.length - 1)];
        const frames = Math.max(1, Math.min(4, this.swordTrail.length - 1));
        slashSpeed = Math.hypot(tip.x - prev.x, tip.y - prev.y) / frames;
      }
      const isClean = slashSpeed > 8;
      const isPerfect = slashSpeed > 20;
      const base = isPerfect ? 50 : isClean ? 20 : 10;
      const pts = this.moonBlessingActive ? base * 2 : base;
      this.onScore(pts, f.pos.x, f.pos.y, isPerfect);
      this.spawnMoonSliceEffects(f.pos.x, f.pos.y, isPerfect);
      return;
    }

    this.onScore(f.score, f.pos.x, f.pos.y, false);

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

  /** Moon Shrine slash: crescent moon dust, silver sparkles, stars, feathers — bigger burst on Perfect Slice. */
  spawnMoonSliceEffects(x: number, y: number, perfect: boolean) {
    const dustCount = perfect ? 26 : 14;
    for (let i = 0; i < dustCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 1,
        life: 30 + Math.random() * 30, maxLife: 60,
        color: 'rgba(220,230,255,0.9)',
        size: 1.5 + Math.random() * 3,
        type: 'sparkle',
      }));
    }
    const starCount = perfect ? 14 : 6;
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 25 + Math.random() * 25, maxLife: 50,
        color: '#e8f0ff',
        size: 3 + Math.random() * 3,
        type: 'star',
      }));
    }
    // White feathers — drift, don't fall
    for (let i = 0; i < (perfect ? 8 : 4); i++) {
      this.particles.push(new Particle({
        x, y,
        vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 1.5,
        life: 50 + Math.random() * 30, maxLife: 80,
        color: 'rgba(255,255,255,0.85)',
        size: 4 + Math.random() * 3,
        type: 'confetti',
      }));
    }
  }
  
  hitBomb(b: Bomb) {
    this.playBomb();
    this.onBombHit();
    
    const palette = b.type === 'Cursed Bamboo Seed' || b.type === 'Cursed Eclipse Orb'
      ? ['#3D1E52', '#8E5AC2', '#B87CF0', '#1A0E24']
      : ['#ff0000', '#ff8800', '#444444', '#000000'];
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle({
        x: b.pos.x, y: b.pos.y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        color: palette[Math.floor(Math.random()*4)],
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

      if (drawMoonSprite(ctx, b.type, b.radius) || drawBambooSprite(ctx, b.type, b.radius) || drawCrimsonSprite(ctx, b.type, b.radius) || drawImperialSprite(ctx, b.type, b.radius)) {
        ctx.restore();
        return;
      }
      
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
      
      if (p.type === 'juice' || p.type === 'smoke' || p.type === 'sparkle') {
        ctx.fillStyle = p.color as string;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color as string;
        ctx.fillRect(-p.size/2, -p.size, p.size, p.size*2);
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color as string;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color as string;
        drawFourPointStar(ctx, p.size);
      }
      ctx.restore();
    });
    
    // Bamboo Grove: sacred bamboo sword follows the fingertip, replacing the cursor.
    if (this.mode === 'bamboo' && this.swordTrail.length > 0) {
      const tip = this.swordTrail[0];
      const prev = this.swordTrail[Math.min(3, this.swordTrail.length - 1)];
      const swordImg = getBambooImage('bamboo-sword.png');
      if (swordImg) {
        const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 4;
        const h = 210;
        const w = h * (swordImg.naturalWidth / swordImg.naturalHeight);
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(angle);
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(120,255,140,0.65)';
        ctx.drawImage(swordImg, -w * 0.15, -h * 0.85, w, h);
        ctx.restore();
      }
    }

    // Moon Shrine: the Moonlight Katana follows the fingertip (~180-220px on a 1080p canvas).
    if (this.mode === 'moon' && this.swordTrail.length > 0) {
      const tip = this.swordTrail[0];
      const prev = this.swordTrail[Math.min(3, this.swordTrail.length - 1)];
      const swordImg = getMoonImage('moon-katana.png');
      if (swordImg) {
        const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 4;
        const h = (200 / 1080) * this.height * 1.9; // scale with canvas, enlarged Moonlight Katana
        const w = h * (swordImg.naturalWidth / swordImg.naturalHeight);
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(angle);
        ctx.shadowBlur = this.moonBlessingActive ? 30 : 20;
        ctx.shadowColor = this.moonBlessingActive ? 'rgba(140,190,255,0.95)' : 'rgba(200,220,255,0.75)';
        ctx.drawImage(swordImg, -w * 0.15, -h * 0.85, w, h);
        ctx.restore();
      }
    }

    // Crimson Temple: the Infernal Dragon Blade follows the fingertip — sized to
    // read as a heavy, weighty weapon (~230-260px on a 1080p canvas) without
    // overwhelming the fruits.
    if (this.mode === 'challenge' && this.swordTrail.length > 0) {
      const tip = this.swordTrail[0];
      const prev = this.swordTrail[Math.min(3, this.swordTrail.length - 1)];
      const swordImg = getCrimsonImage('infernal-dragon-blade.png');
      if (swordImg) {
        const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 4;
        const h = (240 / 1080) * this.height * 1.9;
        const w = h * (swordImg.naturalWidth / swordImg.naturalHeight);
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(angle);
        ctx.shadowBlur = 24;
        ctx.shadowColor = 'rgba(255,90,40,0.85)';
        ctx.drawImage(swordImg, -w * 0.15, -h * 0.85, w, h);
        ctx.restore();
      }
    }

    // Imperial Heaven Palace: the Imperial Heaven Blade follows the fingertip —
    // 20-25% longer and ~20% wider than the Crimson Temple's blade per the
    // zone's "increase sword size" design goal, while staying elegant.
    if (this.mode === 'survival' && this.swordTrail.length > 0) {
      const tip = this.swordTrail[0];
      const prev = this.swordTrail[Math.min(3, this.swordTrail.length - 1)];
      const swordImg = getImperialImage('imperial-heaven-blade.png');
      if (swordImg) {
        const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 4;
        const h = (240 / 1080) * this.height * 1.9 * 1.22;
        const w = h * (swordImg.naturalWidth / swordImg.naturalHeight) * 1.2;
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(angle);
        ctx.shadowBlur = 28;
        ctx.shadowColor = 'rgba(255,220,140,0.9)';
        ctx.drawImage(swordImg, -w * 0.15, -h * 0.85, w, h);
        ctx.restore();
      }
    }

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
      
      // Core — in Bamboo Grove the sacred sword sprite is the cursor, so the
      // trail stays a soft emerald slash streak instead of a plain white cursor line.
      ctx.shadowBlur = 0;
      ctx.strokeStyle = this.mode === 'bamboo' ? 'rgba(180,255,180,0.55)'
        : this.mode === 'moon' ? 'rgba(190,215,255,0.6)'
        : this.mode === 'challenge' ? 'rgba(255,120,60,0.6)'
        : this.mode === 'survival' ? 'rgba(255,225,150,0.65)'
        : '#ffffff';
      ctx.lineWidth = (this.mode === 'bamboo' || this.mode === 'moon' || this.mode === 'challenge' || this.mode === 'survival') ? 2 : 3;
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

/** Small 4-point sparkle/star, drawn centered at the current transform origin. */
function drawFourPointStar(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(0, -size * 2);
  ctx.quadraticCurveTo(size * 0.3, -size * 0.3, size * 2, 0);
  ctx.quadraticCurveTo(size * 0.3, size * 0.3, 0, size * 2);
  ctx.quadraticCurveTo(-size * 0.3, size * 0.3, -size * 2, 0);
  ctx.quadraticCurveTo(-size * 0.3, -size * 0.3, 0, -size * 2);
  ctx.closePath();
  ctx.fill();
}
