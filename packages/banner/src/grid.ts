import type { Random } from './random.js';

export type Rgb = number;

export const hex = (value: string): Rgb => Number.parseInt(value.slice(1), 16);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ordered-dither threshold in (0, 1) for a pixel, the classic 4×4 Bayer matrix
export const bayer = (x: number, y: number): number => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;

const smooth = (t: number): number => t * t * (3 - 2 * t);

export class Grid {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  set(x: number, y: number, color: Rgb): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const o = (y * this.width + x) * 4;
    this.data[o] = (color >> 16) & 255;
    this.data[o + 1] = (color >> 8) & 255;
    this.data[o + 2] = color & 255;
    this.data[o + 3] = 255;
  }

  get(x: number, y: number): Rgb {
    const o = (y * this.width + x) * 4;
    return (this.data[o]! << 16) | (this.data[o + 1]! << 8) | this.data[o + 2]!;
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
  }

  disc(cx: number, cy: number, r: number, color: Rgb): void {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.8) this.set(x, y, color);
  }

  // vertical bands between colour stops, ordered-dithered where two stops meet
  gradient(stops: readonly Rgb[], top = 0, bottom = this.height): void {
    const span = Math.max(1, bottom - top - 1);
    for (let y = top; y < bottom; y++) {
      const t = ((y - top) / span) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(t));
      const f = t - i;
      for (let x = 0; x < this.width; x++)
        this.set(x, y, f > bayer(x, y) ? stops[i + 1]! : stops[i]!);
    }
  }

  fillBelow(tops: readonly number[], color: Rgb, bottom = this.height): void {
    tops.forEach((top, x) => {
      for (let y = Math.round(top); y < bottom; y++) this.set(x, y, color);
    });
  }

  edge(tops: readonly number[], color: Rgb): void {
    tops.forEach((top, x) => this.set(x, Math.round(top), color));
  }
}

// a smooth 1-D skyline: value noise in a few octaves around `base`
export function ridge(
  rnd: Random,
  width: number,
  base: number,
  amplitude: number,
  step: number,
  octaves = 2,
): number[] {
  const tops = Array.from({ length: width }, () => base);
  let amp = amplitude;
  let span = step;
  for (let o = 0; o < octaves; o++) {
    const points = Array.from({ length: Math.ceil(width / span) + 2 }, () => rnd() * 2 - 1);
    for (let x = 0; x < width; x++) {
      const i = Math.floor(x / span);
      const t = smooth((x % span) / span);
      tops[x]! += (points[i]! * (1 - t) + points[i + 1]! * t) * amp;
    }
    amp /= 2;
    span = Math.max(2, Math.floor(span / 2));
  }
  return tops.map(Math.round);
}

// a mountain range: the highest of several jagged triangular peaks at each column
export function peaks(
  rnd: Random,
  width: number,
  base: number,
  count: number,
  minHeight: number,
  maxHeight: number,
): number[] {
  const list = Array.from({ length: count }, (_, i) => ({
    x: ((i + 0.2 + rnd() * 0.6) / count) * width,
    h: minHeight + rnd() * (maxHeight - minHeight),
    left: 0.45 + rnd() * 0.5,
    right: 0.45 + rnd() * 0.5,
  }));
  const jitter = ridge(rnd, width, 0, 1.2, 3, 1);
  return Array.from({ length: width }, (_, x) => {
    let height = 0;
    for (const p of list) {
      const d = x - p.x;
      height = Math.max(height, p.h - Math.abs(d) * (d < 0 ? p.left : p.right));
    }
    return Math.round(base - height + jitter[x]!);
  });
}

// smooth 2-D value noise in [0, 1], for clouds of gas and mist
export function field(rnd: Random, width: number, height: number, cell: number) {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const values = Array.from({ length: cols * rows }, () => rnd());
  return (x: number, y: number): number => {
    const i = Math.floor(x / cell);
    const j = Math.floor(y / cell);
    const tx = smooth((x % cell) / cell);
    const ty = smooth((y % cell) / cell);
    const v = (a: number, b: number) => values[(j + b) * cols + i + a]!;
    const top = v(0, 0) * (1 - tx) + v(1, 0) * tx;
    const bottom = v(0, 1) * (1 - tx) + v(1, 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}
