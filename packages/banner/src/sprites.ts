import { type Grid, type Rgb } from './grid.js';
import { int, type Random } from './random.js';

export function cloud(
  g: Grid,
  rnd: Random,
  x: number,
  y: number,
  width: number,
  light: Rgb,
  shade: Rgb,
): void {
  const puffs = Math.max(2, Math.round(width / 5));
  const radii = Array.from({ length: puffs }, (_, i) => {
    const middle = 1 - Math.abs(i / (puffs - 1) - 0.5) * 2;
    return 1.5 + middle * 2 + rnd() * 1.2;
  });
  const cx = (i: number) => x + (i / (puffs - 1)) * width;
  radii.forEach((r, i) => g.disc(cx(i), y - r + 2, r, shade));
  radii.forEach((r, i) => g.disc(cx(i), y - r + 1, r, light));
  g.rect(Math.round(x), y + 1, Math.round(width) + 1, 1, shade);
}

export function clouds(
  g: Grid,
  rnd: Random,
  count: number,
  top: number,
  bottom: number,
  light: Rgb,
  shade: Rgb,
): void {
  for (let i = 0; i < count; i++) {
    const x = ((i + rnd() * 0.7) / count) * g.width - 6;
    cloud(g, rnd, x, int(rnd, top, bottom), int(rnd, 14, 26), light, shade);
  }
}

export function sun(g: Grid, cx: number, cy: number, r: number, core: Rgb, halo: Rgb): void {
  g.disc(cx, cy, r + 2, halo);
  g.disc(cx, cy, r, core);
}

export function crescent(g: Grid, cx: number, cy: number, r: number, color: Rgb): void {
  const inside = (x: number, y: number, ox: number, oy: number) =>
    (x - ox) ** 2 + (y - oy) ** 2 <= r * r + r * 0.8;
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if (inside(x, y, cx, cy) && !inside(x, y, cx + r * 0.55, cy - r * 0.35)) g.set(x, y, color);
}

export function stars(
  g: Grid,
  rnd: Random,
  count: number,
  bottom: number,
  colors: readonly Rgb[],
): void {
  for (let i = 0; i < count; i++) {
    const x = int(rnd, 0, g.width - 1);
    const y = int(rnd, 0, bottom);
    const color = colors[i % colors.length]!;
    g.set(x, y, color);
    if (rnd() < 0.08) {
      g.set(x - 1, y, color);
      g.set(x + 1, y, color);
      g.set(x, y - 1, color);
      g.set(x, y + 1, color);
    }
  }
}

export function pine(
  g: Grid,
  x: number,
  base: number,
  height: number,
  color: Rgb,
  snow?: Rgb,
): void {
  g.set(x, base, color);
  const tier = Math.max(3, Math.round(height / 3));
  for (let j = 0; j < height; j++) {
    const y = base - height + j;
    const half = Math.floor((j % tier) * 0.6 + j * 0.22);
    for (let i = -half; i <= half; i++) g.set(x + i, y, color);
    if (snow !== undefined && j % tier === 0)
      for (let i = -half; i <= half; i++) g.set(x + i, y, snow);
  }
}

export function tree(
  g: Grid,
  x: number,
  base: number,
  r: number,
  trunk: Rgb,
  leaf: Rgb,
  light: Rgb,
): void {
  const trunkHeight = Math.max(2, Math.round(r * 0.8));
  g.rect(x, base - trunkHeight, 1, trunkHeight + 1, trunk);
  const cy = base - trunkHeight - r + 1;
  g.disc(x, cy, r, leaf);
  g.disc(x - r * 0.3, cy - r * 0.3, Math.max(1, r - 2), light);
}

export function speckle(
  g: Grid,
  rnd: Random,
  count: number,
  tops: readonly number[],
  depth: number,
  colors: readonly Rgb[],
): void {
  for (let i = 0; i < count; i++) {
    const x = int(rnd, 0, g.width - 1);
    g.set(x, tops[x]! + 1 + int(rnd, 0, depth), colors[i % colors.length]!);
  }
}

export function bird(g: Grid, x: number, y: number, color: Rgb): void {
  g.set(x - 1, y - 1, color);
  g.set(x, y, color);
  g.set(x + 1, y - 1, color);
}
