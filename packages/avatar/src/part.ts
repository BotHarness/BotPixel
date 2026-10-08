import { seededRandom } from './random.js';
import { AVATAR_COLORS, type AvatarColor } from './recipe.js';

/**
 * Custom Part slots. A headpiece covers the top of the tile, around the hair: its back layer is
 * drawn behind the hair and its front layer over it. Hair slots replace one built-in hair piece
 * and use only the front layer. Cells are in tile coordinates, so the Avatar centerline sits
 * between x = 15 and x = 16.
 */
export const PART_SLOTS = {
  headpiece: { width: 32, height: 16 },
  bangs: { width: 32, height: 32 },
  leftSideHair: { width: 32, height: 32 },
  rightSideHair: { width: 32, height: 32 },
  backHair: { width: 32, height: 32 },
  outfit: { width: 32, height: 32 },
  accessory: { width: 32, height: 32 },
  beard: { width: 32, height: 32 },
  glasses: { width: 32, height: 32 },
  nose: { width: 32, height: 32 },
  cheeks: { width: 32, height: 32 },
  petals: { width: 32, height: 32 },
  flowerBase: { width: 32, height: 32 },
} as const;
export type PartSlot = keyof typeof PART_SLOTS;
/**
 * Hair slots. In a hair part, a `hairColor` cell at tone 0 is live hair: it is shaded with the
 * rest of the hair, exactly like a built-in piece. Every other cell shows its own color.
 */
export const HAIR_PART_SLOTS = ['bangs', 'leftSideHair', 'rightSideHair', 'backHair'] as const;
export type HairPartSlot = (typeof HAIR_PART_SLOTS)[number];
export const isHairPartSlot = (slot: PartSlot): slot is HairPartSlot =>
  (HAIR_PART_SLOTS as readonly string[]).includes(slot);
/**
 * Slots whose drawn part replaces a built-in part pixel for pixel: the part's cells are painted
 * where the built-in part would be, and every cell shows its own color and tone.
 */
export const REPLACE_PART_SLOTS = [
  'outfit',
  'accessory',
  'beard',
  'glasses',
  'nose',
  'cheeks',
  'petals',
  'flowerBase',
] as const;
export type ReplacePartSlot = (typeof REPLACE_PART_SLOTS)[number];
export const isReplacePartSlot = (slot: PartSlot): slot is ReplacePartSlot =>
  (REPLACE_PART_SLOTS as readonly string[]).includes(slot);
/** Tone steps on the rig's shade ramp: two darker, the color itself, two lighter. */
export const PART_TONES = [-2, -1, 0, 1, 2] as const;
export type PartTone = (typeof PART_TONES)[number];
/** An appearance color slot (it follows the Avatar's color) or a fixed `#rrggbb` color. */
export type PartColor = AvatarColor | `#${string}`;
/** One painted cell: `[x, y, color, tone]`. */
export type PartCell = readonly [x: number, y: number, color: PartColor, tone: PartTone];
export const PART_LAYERS = ['front', 'back'] as const;
export type PartLayerName = (typeof PART_LAYERS)[number];
/** Most fixed colors one part may use. */
export const MAX_PART_FIXED_COLORS = 32;

/**
 * A Human-drawn Custom Part. Its content is immutable and its identity is `customPartId`;
 * name, author, origin and parent are metadata kept outside it.
 */
export interface PixelCustomPart {
  slot: PartSlot;
  front: readonly PartCell[];
  back: readonly PartCell[];
}

/** A dense layer for drawing: `layer[y][x]` is a color and tone, or `null` when empty. */
export type PartInk = { color: PartColor; tone: PartTone };
export type PartLayer = (PartInk | null)[][];

const FIXED = /^#[\da-f]{6}$/iu;
const isColor = (value: unknown): value is PartColor =>
  typeof value === 'string' &&
  ((AVATAR_COLORS as readonly string[]).includes(value) || FIXED.test(value));

export function isPixelCustomPart(value: unknown): value is PixelCustomPart {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (Object.keys(r).length !== 3 || !Object.hasOwn(PART_SLOTS, r['slot'] as string)) return false;
  const { width, height } = PART_SLOTS[r['slot'] as PartSlot];
  if (r['slot'] !== 'headpiece' && (r['back'] as unknown[] | undefined)?.length !== 0) return false;
  const fixed = new Set<string>();
  for (const name of PART_LAYERS) {
    const cells = r[name];
    if (!Array.isArray(cells) || cells.length > width * height) return false;
    const seen = new Set<number>();
    for (const cell of cells as unknown[]) {
      if (!Array.isArray(cell) || cell.length !== 4) return false;
      const [x, y, color, tone] = cell as unknown[];
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        (x as number) < 0 ||
        (x as number) >= width ||
        (y as number) < 0 ||
        (y as number) >= height ||
        !isColor(color) ||
        !(PART_TONES as readonly unknown[]).includes(tone)
      )
        return false;
      const key = (y as number) * width + (x as number);
      if (seen.has(key)) return false;
      seen.add(key);
      if (color.startsWith('#')) fixed.add(color.toLowerCase());
    }
  }
  return fixed.size <= MAX_PART_FIXED_COLORS;
}

const canonicalCells = (cells: readonly PartCell[]): PartCell[] =>
  cells
    .map(
      ([x, y, color, tone]) =>
        [x, y, color.startsWith('#') ? (color.toLowerCase() as PartColor) : color, tone] as const,
    )
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);

/** The part with cells in row order and fixed colors in lowercase. */
export function canonicalCustomPart(part: PixelCustomPart): PixelCustomPart {
  return { slot: part.slot, front: canonicalCells(part.front), back: canonicalCells(part.back) };
}

/** Content identity: a SHA-256 of the canonical slot, cells and color references. */
export function customPartId(part: PixelCustomPart): string {
  return sha256(JSON.stringify(canonicalCustomPart(part)));
}

export function emptyPartLayer(slot: PartSlot): PartLayer {
  const { width, height } = PART_SLOTS[slot];
  return Array.from({ length: height }, () => Array<PartInk | null>(width).fill(null));
}

export function partLayer(slot: PartSlot, cells: readonly PartCell[]): PartLayer {
  const layer = emptyPartLayer(slot);
  for (const [x, y, color, tone] of cells) layer[y]![x] = { color, tone };
  return layer;
}

export function partCells(layer: PartLayer): PartCell[] {
  return layer.flatMap((row, y) =>
    row.flatMap((ink, x) => (ink ? [[x, y, ink.color, ink.tone] as const] : [])),
  );
}

/** Builds a canonical part from two drawn layers. */
export function createCustomPart(
  slot: PartSlot,
  layers: Record<PartLayerName, PartLayer>,
): PixelCustomPart {
  return canonicalCustomPart({
    slot,
    front: partCells(layers.front),
    back: partCells(layers.back),
  });
}

/** The column mirrored across the Avatar centerline. */
export function mirrorPartX(slot: PartSlot, x: number): number {
  return PART_SLOTS[slot].width - 1 - x;
}

const same = (a: PartInk | null, b: PartInk | null) =>
  a === b || (a !== null && b !== null && a.color === b.color && a.tone === b.tone);

/** Sets cells (pencil with ink, eraser with `null`), optionally mirrored across the centerline. */
export function paintPartLayer(
  slot: PartSlot,
  layer: PartLayer,
  points: readonly (readonly [number, number])[],
  ink: PartInk | null,
  mirror = false,
): PartLayer {
  const out = layer.map((row) => [...row]);
  const { width, height } = PART_SLOTS[slot];
  for (const [x, y] of points)
    for (const px of mirror ? [x, mirrorPartX(slot, x)] : [x])
      if (px >= 0 && px < width && y >= 0 && y < height) out[y]![px] = ink;
  return out;
}

/**
 * 4-connected flood fill from a cell: every cell reachable through cells equal to the start
 * becomes `ink`. With `mirror`, the mirrored start is filled too.
 */
export function fillPartLayer(
  slot: PartSlot,
  layer: PartLayer,
  x: number,
  y: number,
  ink: PartInk | null,
  mirror = false,
): PartLayer {
  const { width, height } = PART_SLOTS[slot];
  let out = layer.map((row) => [...row]);
  for (const sx of mirror ? [x, mirrorPartX(slot, x)] : [x]) {
    if (sx < 0 || sx >= width || y < 0 || y >= height) continue;
    const target = out[y]![sx]!;
    if (same(target, ink)) continue;
    const next = out.map((row) => [...row]);
    const stack: [number, number][] = [[sx, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      if (!same(next[cy]![cx]!, target)) continue;
      next[cy]![cx] = ink;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    out = next;
  }
  return out;
}

/** Pixel-perfect line points (Bresenham). With `snap`, the end snaps to 0°, 45° or 90°. */
export function partLinePoints(
  from: readonly [number, number],
  to: readonly [number, number],
  snap = false,
): [number, number][] {
  let [x1, y1] = to;
  const [x0, y0] = from;
  if (snap) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax > ay * 2) y1 = y0;
    else if (ay > ax * 2) x1 = x0;
    else {
      const m = Math.max(ax, ay);
      x1 = x0 + Math.sign(dx) * m;
      y1 = y0 + Math.sign(dy) * m;
    }
  }
  const points: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let [x, y] = [x0, y0];
  for (;;) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
  }
  return points;
}

/** Rectangle outline points between two corners. With `square`, the far corner makes a square. */
export function partRectPoints(
  from: readonly [number, number],
  to: readonly [number, number],
  square = false,
): [number, number][] {
  const [x0, y0] = from;
  let [x1, y1] = to;
  if (square) {
    const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    x1 = x0 + (x1 < x0 ? -m : m);
    y1 = y0 + (y1 < y0 ? -m : m);
  }
  const [left, right] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [top, bottom] = [Math.min(y0, y1), Math.max(y0, y1)];
  const points = new Map<string, [number, number]>();
  for (let x = left; x <= right; x++)
    for (const y of [top, bottom]) points.set(`${x},${y}`, [x, y]);
  for (let y = top; y <= bottom; y++)
    for (const x of [left, right]) points.set(`${x},${y}`, [x, y]);
  return [...points.values()];
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;
const BAYER2 = [
  [0, 2],
  [3, 1],
] as const;

/** The ordered-dither threshold in [0, 1) for a cell. */
export function ditherThreshold(x: number, y: number, size: 2 | 4 = 4): number {
  return size === 4 ? (BAYER4[y & 3]![x & 3]! + 0.5) / 16 : (BAYER2[y & 1]![x & 1]! + 0.5) / 4;
}

/**
 * A linear gradient over the 4-connected region of the start cell: each cell's position along
 * `from`→`to` steps through the tones between `fromTone` and `toTone`, with ordered dithering
 * between neighboring tones. No RGB is blended; the result is ordinary cells.
 */
export function gradientPartLayer(
  slot: PartSlot,
  layer: PartLayer,
  from: readonly [number, number],
  to: readonly [number, number],
  color: PartColor,
  fromTone: PartTone,
  toTone: PartTone,
  options: { dither?: 2 | 4; mirror?: boolean } = {},
): PartLayer {
  const { width, height } = PART_SLOTS[slot];
  const out = layer.map((row) => [...row]);
  const [fx, fy] = from;
  const region = (sx: number, sy: number): [number, number][] => {
    if (sx < 0 || sx >= width || sy < 0 || sy >= height) return [];
    const target = layer[sy]![sx]!;
    const seen = new Set<number>();
    const cells: [number, number][] = [];
    const stack: [number, number][] = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= width || y < 0 || y >= height || seen.has(y * width + x)) continue;
      if (!same(layer[y]![x]!, target)) continue;
      seen.add(y * width + x);
      cells.push([x, y]);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return cells;
  };
  const paint = (
    cells: [number, number][],
    start: readonly [number, number],
    end: readonly [number, number],
    ditherX: (x: number) => number,
  ) => {
    const vx = end[0] - start[0];
    const vy = end[1] - start[1];
    const length = vx * vx + vy * vy;
    const steps = toTone - fromTone;
    for (const [x, y] of cells) {
      const t =
        length === 0
          ? 0
          : Math.min(1, Math.max(0, ((x - start[0]) * vx + (y - start[1]) * vy) / length));
      const position = t * Math.abs(steps);
      const base = Math.floor(position);
      const up = position - base > ditherThreshold(ditherX(x), y, options.dither ?? 4) ? 1 : 0;
      const tone = (fromTone + Math.sign(steps) * Math.min(Math.abs(steps), base + up)) as PartTone;
      out[y]![x] = { color, tone };
    }
  };
  paint(region(fx, fy), from, to, (x) => x);
  if (options.mirror) {
    const mirrored = (point: readonly [number, number]) =>
      [mirrorPartX(slot, point[0]), point[1]] as const;
    paint(
      region(mirrorPartX(slot, fx), fy).filter(([x, y]) => out[y]![x] === layer[y]![x]),
      mirrored(from),
      mirrored(to),
      (x) => mirrorPartX(slot, x),
    );
  }
  return out;
}

/**
 * Moves the tone of colored cells by ±1 at random, for texture. The same seed gives the same
 * result; the seed is used only now, and the result is ordinary cells. With `mirror`, each cell
 * and its mirror get the same change.
 */
export function noisePartLayer(
  slot: PartSlot,
  layer: PartLayer,
  amount: number,
  seed: string,
  mirror = false,
): PartLayer {
  const random = seededRandom(seed);
  const rolls = layer.map((row) => row.map(() => [random(), random() < 0.5 ? -1 : 1] as const));
  return layer.map((row, y) =>
    row.map((ink, x) => {
      const source = mirror ? Math.min(x, mirrorPartX(slot, x)) : x;
      const [roll, direction] = rolls[y]![source]!;
      if (!ink || roll >= amount) return ink;
      return {
        color: ink.color,
        tone: Math.max(-2, Math.min(2, ink.tone + direction)) as PartTone,
      };
    }),
  );
}

/** Moves the tone of each colored cell on the points by `delta` once; empty cells are skipped. */
export function shadePartLayer(
  slot: PartSlot,
  layer: PartLayer,
  points: readonly (readonly [number, number])[],
  delta: 1 | -1,
  mirror = false,
): PartLayer {
  const { width, height } = PART_SLOTS[slot];
  const out = layer.map((row) => [...row]);
  const done = new Set<string>();
  for (const [x, y] of points)
    for (const px of mirror ? [x, mirrorPartX(slot, x)] : [x]) {
      const key = `${px},${y}`;
      if (done.has(key) || px < 0 || px >= width || y < 0 || y >= height) continue;
      done.add(key);
      const ink = layer[y]![px];
      if (ink)
        out[y]![px] = {
          color: ink.color,
          tone: Math.max(-2, Math.min(2, ink.tone + delta)) as PartTone,
        };
    }
  return out;
}

const K = Uint32Array.from(
  '428a2f98 71374491 b5c0fbcf e9b5dba5 3956c25b 59f111f1 923f82a4 ab1c5ed5 d807aa98 12835b01 243185be 550c7dc3 72be5d74 80deb1fe 9bdc06a7 c19bf174 e49b69c1 efbe4786 0fc19dc6 240ca1cc 2de92c6f 4a7484aa 5cb0a9dc 76f988da 983e5152 a831c66d b00327c8 bf597fc7 c6e00bf3 d5a79147 06ca6351 14292967 27b70a85 2e1b2138 4d2c6dfc 53380d13 650a7354 766a0abb 81c2c92e 92722c85 a2bfe8a1 a81a664b c24b8b70 c76c51a3 d192e819 d6990624 f40e3585 106aa070 19a4c116 1e376c08 2748774c 34b0bcb5 391c0cb3 4ed8aa4a 5b9cca4f 682e6ff3 748f82ee 78a5636f 84c87814 8cc70208 90befffa a4506ceb bef9a3f7 c67178f2'
    .split(' ')
    .map((h) => Number.parseInt(h, 16)),
);

function sha256(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const length = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(length);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(length - 8, Math.floor((bytes.length * 8) / 2 ** 32));
  view.setUint32(length - 4, (bytes.length * 8) >>> 0);
  const h = Uint32Array.from([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (v: number, n: number) => (v >>> n) | (v << (32 - n));
  for (let offset = 0; offset < length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!;
      const b = w[i - 2]!;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, k] = h as unknown as number[];
    for (let i = 0; i < 64; i++) {
      const t1 =
        (k! +
          (rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25)) +
          ((e! & f!) ^ (~e! & g!)) +
          K[i]! +
          w[i]!) >>>
        0;
      const t2 =
        ((rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22)) + ((a! & b!) ^ (a! & c!) ^ (b! & c!))) >>> 0;
      k = g;
      g = f;
      f = e;
      e = (d! + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, k].forEach((v, i) => (h[i] = (h[i]! + v!) >>> 0));
  }
  return [...h].map((v) => v.toString(16).padStart(8, '0')).join('');
}
