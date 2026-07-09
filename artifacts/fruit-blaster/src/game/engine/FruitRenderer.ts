/**
 * FruitRenderer — draws each fruit type as a proper cartoon illustration
 * All drawing is relative to origin (0,0); caller must translate+rotate first.
 */

import { FRUIT_DATA, BOMB_DATA, MOON_FRUIT_TYPES, CRIMSON_FRUIT_TYPES, IMPERIAL_FRUIT_TYPES } from '../../constants/GameData';
import { getBambooImage, getMoonImage, getCrimsonImage, getImperialImage } from '../../utils/imageCache';

/** True for any type that belongs to the Moon Shrine's custom celestial asset set. */
function isMoonType(type: string): boolean {
  return MOON_FRUIT_TYPES.includes(type as any) || type === 'Lunar Kiwi' || type === 'Cursed Eclipse Orb';
}

/** True for any type that belongs to the Crimson Temple's custom infernal asset set. */
function isCrimsonType(type: string): boolean {
  return CRIMSON_FRUIT_TYPES.includes(type as any) || type === 'Infernal Dragon Core';
}

/** True for any type that belongs to the Imperial Heaven Palace's custom legendary asset set. */
function isImperialType(type: string): boolean {
  return IMPERIAL_FRUIT_TYPES.includes(type as any) || type === "Emperor's Judgment Orb";
}

/** Fruit/hazard types rendered from our hand-painted Bamboo Grove sprites instead of vector art. */
function bambooImageFor(type: string): string | undefined {
  if (isMoonType(type) || isCrimsonType(type) || isImperialType(type)) return undefined;
  return (FRUIT_DATA as any)[type]?.image ?? (BOMB_DATA as any)[type]?.image;
}

/** Moon Shrine sprites (celestial fruits, Cursed Eclipse Orb) — loaded from public/moon/. */
function moonImageFor(type: string): string | undefined {
  if (!isMoonType(type)) return undefined;
  return (FRUIT_DATA as any)[type]?.image ?? (BOMB_DATA as any)[type]?.image;
}

/** Crimson Temple sprites (infernal fruits, Infernal Dragon Core) — loaded from public/crimson/. */
function crimsonImageFor(type: string): string | undefined {
  if (!isCrimsonType(type)) return undefined;
  return (FRUIT_DATA as any)[type]?.image ?? (BOMB_DATA as any)[type]?.image;
}

/** Imperial Heaven Palace sprites (legendary fruits, Emperor's Judgment Orb) — loaded from public/imperial/. */
function imperialImageFor(type: string): string | undefined {
  if (!isImperialType(type)) return undefined;
  return (FRUIT_DATA as any)[type]?.image ?? (BOMB_DATA as any)[type]?.image;
}

/** Same contract as drawBambooSprite, but reads from the Crimson Temple asset folder. Fruits render larger (2.6x radius) per the Crimson Temple's "big fruit" design goal. */
export function drawCrimsonSprite(ctx: CanvasRenderingContext2D, type: string, r: number): boolean {
  const file = crimsonImageFor(type);
  if (!file) return false;
  const img = getCrimsonImage(file);
  if (!img) return false;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const targetH = r * 2.6;
  const targetW = targetH * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
  return true;
}

/** Same contract as drawBambooSprite, but reads from the Imperial Heaven Palace asset folder. Fruits render largest of all worlds (2.9x radius) per the zone's "increase fruit size ~15-20% over Crimson Temple" design goal. */
export function drawImperialSprite(ctx: CanvasRenderingContext2D, type: string, r: number): boolean {
  const file = imperialImageFor(type);
  if (!file) return false;
  const img = getImperialImage(file);
  if (!img) return false;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const targetH = r * 2.7;
  const targetW = targetH * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
  return true;
}

/** Same contract as drawBambooSprite, but reads from the Moon Shrine asset folder. */
export function drawMoonSprite(ctx: CanvasRenderingContext2D, type: string, r: number): boolean {
  const file = moonImageFor(type);
  if (!file) return false;
  const img = getMoonImage(file);
  if (!img) return false;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const targetH = r * 2.1;
  const targetW = targetH * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
  return true;
}

/**
 * Draws a transparent-PNG sprite centered at the origin (anchor 0.5, 0.5),
 * preserving aspect ratio and alpha. Caller must have already translated to
 * the entity position and rotated around Z only — this never touches X/Y tilt.
 * Returns true if the sprite was drawn, false if the asset isn't loaded yet
 * (callers must skip the frame rather than fall back to placeholder art).
 */
export function drawBambooSprite(ctx: CanvasRenderingContext2D, type: string, r: number): boolean {
  const file = bambooImageFor(type);
  if (!file) return false;
  const img = getBambooImage(file);
  if (!img) return false;

  ctx.save();
  ctx.globalAlpha = 1; // constant opacity until sliced — never fade the live sprite
  ctx.globalCompositeOperation = 'source-over'; // straight alpha-over compositing, no white-halo blending
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const targetH = r * 2.1;
  const targetW = targetH * (img.naturalWidth / img.naturalHeight);
  // Centered anchor: draw offset by exactly half the sprite's box.
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
  return true;
}

function drawStem(ctx: CanvasRenderingContext2D, r: number, color = '#5C3D1E') {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.15, -r * 1.25, r * 0.05, -r * 1.45);
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawLeaf(ctx: CanvasRenderingContext2D, r: number, color = '#4CAF50') {
  ctx.save();
  ctx.translate(r * 0.05, -r * 1.35);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(r * 0.25, 0, r * 0.3, r * 0.12, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function drawFruit(ctx: CanvasRenderingContext2D, type: string, r: number) {
  if (imperialImageFor(type)) {
    // Imperial Heaven Palace sprites: skip drawing entirely until the real asset
    // is loaded rather than flashing generic vector art as a placeholder.
    drawImperialSprite(ctx, type, r);
    return;
  }
  if (moonImageFor(type)) {
    // Moon Shrine sprites: skip drawing entirely until the real asset is
    // loaded rather than flashing generic vector art as a placeholder.
    drawMoonSprite(ctx, type, r);
    return;
  }
  if (crimsonImageFor(type)) {
    // Crimson Temple sprites: skip drawing entirely until the real asset is
    // loaded rather than flashing generic vector art as a placeholder.
    drawCrimsonSprite(ctx, type, r);
    return;
  }
  if (bambooImageFor(type)) {
    // Bamboo Grove sprites: skip drawing entirely until the real asset is
    // loaded rather than flashing generic vector art as a placeholder.
    drawBambooSprite(ctx, type, r);
    return;
  }
  switch (type) {
    case 'Apple':      drawApple(ctx, r); break;
    case 'Orange':     drawOrange(ctx, r); break;
    case 'Banana':     drawBanana(ctx, r); break;
    case 'Watermelon': drawWatermelon(ctx, r); break;
    case 'Kiwi':       drawKiwi(ctx, r); break;
    case 'Pineapple':  drawPineapple(ctx, r); break;
    case 'Pear':       drawPear(ctx, r); break;
    case 'Dragon Fruit': drawDragonFruit(ctx, r); break;
    case 'Strawberry': drawStrawberry(ctx, r); break;
    case 'Blueberry':  drawBlueberry(ctx, r); break;
    case 'Golden Apple': drawGoldenApple(ctx, r); break;
    case 'Rainbow Mango': drawRainbowMango(ctx, r); break;
    default:           drawApple(ctx, r);
  }
}

export function drawFruitHalf(ctx: CanvasRenderingContext2D, type: string, r: number, isLeft: boolean) {
  ctx.save();
  ctx.beginPath();
  if (isLeft) {
    ctx.rect(-r * 1.5, -r * 1.5, r * 1.5, r * 3);
  } else {
    ctx.rect(0, -r * 1.5, r * 1.5, r * 3);
  }
  ctx.clip();
  drawFruitInner(ctx, type, r);
  ctx.restore();

  // Flat cut surface
  ctx.save();
  ctx.beginPath();
  ctx.rect(isLeft ? -r * 0.05 : -r * 0.05, -r, 0.1 * r, r * 2);
  ctx.fillStyle = getFruitInnerColor(type);
  ctx.fill();
  ctx.restore();
}

function getFruitInnerColor(type: string): string {
  const map: Record<string, string> = {
    Apple: '#FFFDE7', Orange: '#FFB74D', Banana: '#FFFDE7', Watermelon: '#FF4444',
    Kiwi: '#8BC34A', Pineapple: '#FFF9C4', Pear: '#F1F8E9', 'Dragon Fruit': '#F8F8F8',
    Strawberry: '#FF8A80', Blueberry: '#9575CD', 'Golden Apple': '#FFFF88', 'Rainbow Mango': '#FFD54F',
    'Jade Apple': '#E8F7D8', 'Bamboo Pear': '#F1F8DC', 'Emerald Kiwi': '#C7E8A8', 'Lotus Peach': '#FFF3EE',
    'Zen Melon': '#DFF3C4', 'Sacred Plum': '#E2CBF2', 'Forest Lime': '#EEF7CF',
    'Celestial Apple': '#e8e6ff', 'Spirit Pear': '#ffffff', 'Lunar Kiwi': '#ffffff',
    'Moon Peach': '#fff5f8', 'Moon Mandarin': '#ffffff', 'Silver Melon': '#ffffff',
    'Luna Plum': '#c9b3e8', 'Moon Lime': '#f5f8d8',
    'Infernal Apple': '#ff8a3d', 'Infernal Banana': '#ffb347', 'Infernal Grape': '#ff6b3d',
    'Infernal Papaya': '#ff9a3d', 'Infernal Strawberry': '#ff5533', 'Infernal Tomato': '#ff6a33',
    'Infernal Watermelon': '#ff7733', 'Infernal Pineapple': '#ffaa33',
    'Imperial Apple': '#ffe8b8', 'Imperial Banana': '#fff8e0', 'Imperial Cherry': '#ffd8d8',
    'Imperial Raspberry': '#ffd0e0', 'Imperial Gooseberry': '#f0f8c8', 'Imperial Grapefruit': '#ffe0d0',
    'Imperial Sugarcane': '#f4f8e8', 'Imperial Jackfruit': '#fff0c0', 'Imperial Durian': '#f0f4d0',
  };
  return map[type] || '#ffffff';
}

function drawFruitInner(ctx: CanvasRenderingContext2D, type: string, r: number) {
  // Draw with inner flesh visible (lighter center)
  drawFruit(ctx, type, r);
  // Overlay lighter flesh at center
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7);
  grad.addColorStop(0, getFruitInnerColor(type));
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// ────────────────────────────────────────────────────────────────────
// Individual fruit drawing functions
// ────────────────────────────────────────────────────────────────────

function drawApple(ctx: CanvasRenderingContext2D, r: number) {
  // Body
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#FF8A80');
  g.addColorStop(0.5, '#F44336');
  g.addColorStop(1, '#B71C1C');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.18, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  // Dent at top
  ctx.beginPath();
  ctx.arc(0, -r, r * 0.2, 0, Math.PI, false);
  ctx.fillStyle = '#B71C1C';
  ctx.fill();
  drawStem(ctx, r);
  drawLeaf(ctx, r);
}

function drawOrange(ctx: CanvasRenderingContext2D, r: number) {
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#FFD54F');
  g.addColorStop(0.4, '#FF9800');
  g.addColorStop(1, '#E65100');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Peel texture dots
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const d = r * 0.65;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
  }
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.28, r * 0.18, r * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  drawLeaf(ctx, r, '#388E3C');
}

function drawBanana(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();
  // Banana crescent shape
  const bw = r * 1.6;
  const bh = r * 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, bw, bh, 0.3, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(-bw, 0, bw, 0);
  g.addColorStop(0, '#8D6E00');
  g.addColorStop(0.1, '#FFEE58');
  g.addColorStop(0.5, '#FFDD00');
  g.addColorStop(0.9, '#FFEE58');
  g.addColorStop(1, '#8D6E00');
  ctx.fillStyle = g;
  ctx.fill();
  // Ridge line
  ctx.beginPath();
  ctx.ellipse(0, bh * 0.2, bw * 0.85, bh * 0.12, 0.3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180,130,0,0.4)';
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-bw * 0.25, -bh * 0.2, bw * 0.35, bh * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  ctx.restore();
}

function drawWatermelon(ctx: CanvasRenderingContext2D, r: number) {
  // Green rind
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#4CAF50';
  ctx.fill();
  // Dark green stripes
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i / 6) * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.12, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(27,94,32,0.45)';
    ctx.fill();
    ctx.restore();
  }
  // Lighter green highlight stripe
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(165,214,167,0.4)';
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
  // Highlight shine
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.32, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
}

function drawKiwi(ctx: CanvasRenderingContext2D, r: number) {
  // Brown outer skin
  const g = ctx.createRadialGradient(-r*0.2, -r*0.2, 0, 0, 0, r);
  g.addColorStop(0, '#A1887F');
  g.addColorStop(0.5, '#795548');
  g.addColorStop(1, '#4E342E');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Fuzzy texture lines
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const x1 = Math.cos(a) * r * 0.72;
    const y1 = Math.sin(a) * r * 0.72;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Inner green flesh circle
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.68);
  ig.addColorStop(0, '#F9FBE7');
  ig.addColorStop(0.3, '#C5E1A5');
  ig.addColorStop(0.7, '#8BC34A');
  ig.addColorStop(1, '#558B2F');
  ctx.fillStyle = ig;
  ctx.fill();
  // Seeds (dark teardrop shapes around center)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sx = Math.cos(a) * r * 0.38;
    const sy = Math.sin(a) * r * 0.38;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.06, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2E3A1A';
    ctx.fill();
    ctx.restore();
  }
  // White center
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#FAFAFA';
  ctx.fill();
}

function drawPineapple(ctx: CanvasRenderingContext2D, r: number) {
  const bh = r * 1.15;
  const bw = r * 0.78;
  // Body
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, bw, bh, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-bw*0.3, -r*0.3, 0, 0, 0, bh);
  g.addColorStop(0, '#FFF59D');
  g.addColorStop(0.4, '#FFD600');
  g.addColorStop(1, '#F9A825');
  ctx.fillStyle = g;
  ctx.fill();
  // Diamond crosshatch
  ctx.save();
  ctx.clip();
  for (let row = -6; row < 7; row++) {
    for (let col = -4; col < 5; col++) {
      const ox = col * r * 0.36 + (row % 2 === 0 ? r * 0.18 : 0);
      const oy = row * r * 0.28 + r * 0.1;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-r * 0.14, -r * 0.14, r * 0.28, r * 0.28);
      ctx.strokeStyle = 'rgba(180,120,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  // Leaves
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.translate(i * r * 0.22, -bh * 0.82);
    ctx.rotate(i * 0.28);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.45, r * 0.1, r * 0.52, 0, 0, Math.PI * 2);
    const lg = ctx.createLinearGradient(0, -r * 0.9, 0, 0);
    lg.addColorStop(0, '#1B5E20');
    lg.addColorStop(1, '#4CAF50');
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.restore();
  }
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-bw * 0.3, -r * 0.35, bw * 0.22, bh * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
}

function drawPear(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();
  ctx.beginPath();
  // Pear shape: small top circle + bigger bottom circle blended
  ctx.arc(0, -r * 0.28, r * 0.55, 0, Math.PI * 2);
  const g1 = ctx.createRadialGradient(-r*0.2, -r*0.5, 0, 0, -r*0.28, r*0.55);
  g1.addColorStop(0, '#F9FBE7');
  g1.addColorStop(0.5, '#CDDC39');
  g1.addColorStop(1, '#827717');
  ctx.fillStyle = g1;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, r * 0.35, r * 0.82, 0, Math.PI * 2);
  const g2 = ctx.createRadialGradient(-r*0.25, r*0.1, 0, 0, r*0.35, r*0.82);
  g2.addColorStop(0, '#F9FBE7');
  g2.addColorStop(0.45, '#C5D835');
  g2.addColorStop(1, '#827717');
  ctx.fillStyle = g2;
  ctx.fill();
  ctx.restore();
  // Highlight on top
  ctx.beginPath();
  ctx.ellipse(-r*0.22, -r*0.45, r*0.14, r*0.08, -0.3, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  drawStem(ctx, r * 0.72, '#5D4037');
  drawLeaf(ctx, r * 0.72, '#388E3C');
}

function drawDragonFruit(ctx: CanvasRenderingContext2D, r: number) {
  // Pink body
  const g = ctx.createRadialGradient(-r*0.25, -r*0.25, 0, 0, 0, r);
  g.addColorStop(0, '#F48FB1');
  g.addColorStop(0.5, '#E91E63');
  g.addColorStop(1, '#880E4F');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Scale bumps
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sx = Math.cos(a) * r * 0.78;
    const sy = Math.sin(a) * r * 0.78;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    // Green pointed scale
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.12, -r * 0.22);
    ctx.lineTo(r * 0.12, -r * 0.22);
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
    ctx.restore();
  }
  // Yellow dots (seeds visible through skin)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a)*r*0.42, Math.sin(a)*r*0.42, r*0.055, 0, Math.PI*2);
    ctx.fillStyle = '#FFF176';
    ctx.fill();
  }
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r*0.28, -r*0.3, r*0.18, r*0.11, -0.4, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
}

function drawStrawberry(ctx: CanvasRenderingContext2D, r: number) {
  // Body — rounded triangle / teardrop
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.bezierCurveTo(r * 0.88, r * 0.6, r * 0.95, -r * 0.2, r * 0.5, -r * 0.6);
  ctx.bezierCurveTo(r * 0.25, -r * 0.85, -r * 0.25, -r * 0.85, -r * 0.5, -r * 0.6);
  ctx.bezierCurveTo(-r * 0.95, -r * 0.2, -r * 0.88, r * 0.6, 0, r * 0.95);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r*0.7, r, r);
  g.addColorStop(0, '#FF8A80');
  g.addColorStop(0.4, '#F44336');
  g.addColorStop(1, '#B71C1C');
  ctx.fillStyle = g;
  ctx.fill();
  // Seeds (small oval dimples)
  for (let row = 0; row < 4; row++) {
    const cols = row === 0 ? 2 : row === 1 ? 3 : row === 2 ? 3 : 2;
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * r * 0.3;
      const y = -r * 0.35 + row * r * 0.33;
      ctx.beginPath();
      ctx.ellipse(x, y, r*0.065, r*0.09, 0, 0, Math.PI*2);
      ctx.fillStyle = '#FFF9C4';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - r*0.015, y - r*0.015, r*0.035, r*0.045, 0, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }
  }
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r*0.25, -r*0.2, r*0.14, r*0.09, -0.4, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fill();
  ctx.restore();
  // Leaf crown
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.translate(i * r * 0.2, -r * 0.62);
    ctx.rotate(i * 0.35);
    ctx.beginPath();
    ctx.ellipse(0, -r*0.2, r*0.09, r*0.28, 0, 0, Math.PI*2);
    ctx.fillStyle = '#388E3C';
    ctx.fill();
    ctx.restore();
  }
}

function drawBlueberry(ctx: CanvasRenderingContext2D, r: number) {
  const g = ctx.createRadialGradient(-r*0.28, -r*0.28, 0, 0, 0, r);
  g.addColorStop(0, '#9FA8DA');
  g.addColorStop(0.4, '#5C6BC0');
  g.addColorStop(1, '#1A237E');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Crown dimple at top
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r * 0.25;
    const py = -r * 0.75 + Math.sin(a) * r * 0.1;
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#7986CB';
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  ctx.stroke();
  // Bloom
  ctx.beginPath();
  ctx.arc(0, -r * 0.72, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#E8EAF6';
  ctx.fill();
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r*0.28, -r*0.3, r*0.16, r*0.1, -0.4, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
}

function drawGoldenApple(ctx: CanvasRenderingContext2D, r: number) {
  // Glow aura
  const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.4);
  glow.addColorStop(0, 'rgba(255,215,0,0.35)');
  glow.addColorStop(1, 'rgba(255,165,0,0)');
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  // Body
  const g = ctx.createRadialGradient(-r*0.25, -r*0.25, r*0.05, 0, 0, r);
  g.addColorStop(0, '#FFFF88');
  g.addColorStop(0.35, '#FFD700');
  g.addColorStop(0.7, '#FFA000');
  g.addColorStop(1, '#E65100');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Gold rim
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = r * 0.07;
  ctx.stroke();
  // Sparkle highlights
  const sparkles = [[r*0.4, -r*0.5], [-r*0.55, r*0.25], [r*0.2, r*0.6], [-r*0.2, -r*0.65]];
  sparkles.forEach(([sx, sy]) => {
    ctx.save();
    ctx.translate(sx, sy);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = r * 0.06;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  });
  // Shine
  ctx.beginPath();
  ctx.ellipse(-r*0.28, -r*0.32, r*0.18, r*0.11, -0.5, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  // Dent + stem
  ctx.beginPath();
  ctx.arc(0, -r, r * 0.18, 0, Math.PI, false);
  ctx.fillStyle = '#E65100';
  ctx.fill();
  drawStem(ctx, r, '#5D4037');
  drawLeaf(ctx, r, '#1B5E20');
}

function drawRainbowMango(ctx: CanvasRenderingContext2D, r: number) {
  // Mango oval shape
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, r * 0.08, r * 0.78, r * 1.05, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#FF1744');
  g.addColorStop(0.18, '#FF9100');
  g.addColorStop(0.36, '#FFD600');
  g.addColorStop(0.54, '#00E676');
  g.addColorStop(0.72, '#2979FF');
  g.addColorStop(0.9, '#D500F9');
  g.addColorStop(1, '#FF1744');
  ctx.fillStyle = g;
  ctx.fill();
  // Prismatic shimmer overlay
  const shimmer = ctx.createRadialGradient(-r*0.2, -r*0.3, 0, 0, 0, r);
  shimmer.addColorStop(0, 'rgba(255,255,255,0.3)');
  shimmer.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(0, r*0.08, r*0.78, r*1.05, 0, 0, Math.PI*2);
  ctx.fillStyle = shimmer;
  ctx.fill();
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r*0.25, -r*0.35, r*0.2, r*0.12, -0.4, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  ctx.restore();
  drawStem(ctx, r, '#33691E');
}
