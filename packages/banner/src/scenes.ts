import { bayer, field, type Grid, hex, peaks, ridge, type Rgb } from './grid.js';
import { int, pick, type Random } from './random.js';
import { bird, clouds, crescent, pine, speckle, stars, sun, tree } from './sprites.js';

export type Painter = (g: Grid, rnd: Random) => void;

const c = (...values: string[]): Rgb[] => values.map(hex);

const spring: Painter = (g, rnd) => {
  g.gradient(c('#8ec9f0', '#a9d6f3', '#c9e6f7', '#e6f3f1'), 0, 36);
  clouds(g, rnd, 4, 6, 18, hex('#ffffff'), hex('#d3e5f2'));
  const far = ridge(rnd, g.width, 29, 4, 30);
  g.fillBelow(far, hex('#a3cfae'));
  const mid = ridge(rnd, g.width, 35, 3, 24);
  g.fillBelow(mid, hex('#82c070'));
  const blossoms = c('#f4b3c6', '#f7c4d3');
  for (let i = 0, n = int(rnd, 3, 5); i < n; i++) {
    const x = Math.round(((i + 0.2 + rnd() * 0.6) / n) * g.width);
    tree(g, x, mid[x]! + 1, int(rnd, 3, 5), hex('#7a5242'), pick(rnd, blossoms), hex('#fde3ea'));
  }
  const near = ridge(rnd, g.width, 42, 2, 40);
  g.fillBelow(near, hex('#62ab52'));
  g.edge(near, hex('#79bd64'));
  speckle(g, rnd, 26, near, 6, c('#4f9543'));
  speckle(g, rnd, 44, near, 7, c('#ffffff', '#ffd84d', '#f48fb1', '#c9a6f2'));
};

const summer: Painter = (g, rnd) => {
  g.gradient(c('#2e8ee0', '#4aa5ee', '#76c0f4', '#ace0f8'), 0, 36);
  sun(g, int(rnd, 16, g.width - 16), int(rnd, 9, 13), 5, hex('#fff6b8'), hex('#ffe27a'));
  clouds(g, rnd, 3, 8, 20, hex('#ffffff'), hex('#cde2f3'));
  const far = ridge(rnd, g.width, 31, 3, 34);
  g.fillBelow(far, hex('#5aa98a'));
  const mid = ridge(rnd, g.width, 36, 2, 26);
  g.fillBelow(mid, hex('#3f9a45'));
  for (let i = 0, n = int(rnd, 4, 7); i < n; i++) {
    const x = Math.round(((i + 0.2 + rnd() * 0.6) / n) * g.width);
    tree(g, x, mid[x]! + 1, int(rnd, 3, 5), hex('#5c3b24'), hex('#2e7d32'), hex('#49a84e'));
  }
  const near = ridge(rnd, g.width, 41, 1, 40);
  g.fillBelow(near, hex('#5db74a'));
  g.edge(near, hex('#7ccc5f'));
  for (let i = 0, n = int(rnd, 6, 10); i < n; i++) {
    const x = int(rnd, 2, g.width - 3);
    const top = near[x]! + int(rnd, 1, 4);
    const stem = int(rnd, 3, 5);
    g.rect(x, top, 1, stem + 6, hex('#2f7a2a'));
    g.disc(x, top, 1.5, hex('#ffc61a'));
    g.set(x, top, hex('#7a4a1c'));
  }
  speckle(g, rnd, 30, near, 7, c('#4aa33a', '#80cf60'));
};

const autumn: Painter = (g, rnd) => {
  g.gradient(c('#ef9d58', '#f4b876', '#f8d29c', '#fbe6c2'), 0, 40);
  sun(g, int(rnd, 20, g.width - 20), int(rnd, 22, 26), 6, hex('#fff2c6'), hex('#fbd894'));
  clouds(g, rnd, 3, 6, 14, hex('#fbe2bf'), hex('#efb886'));
  const far = ridge(rnd, g.width, 31, 4, 32);
  g.fillBelow(far, hex('#bf8159'));
  const mid = ridge(rnd, g.width, 37, 3, 24);
  g.fillBelow(mid, hex('#9c5d3a'));
  const leaves: [string, string][] = [
    ['#e0632e', '#f28a50'],
    ['#efa12e', '#f8c75c'],
    ['#c63d2b', '#e0644c'],
  ];
  for (let i = 0, n = int(rnd, 5, 7); i < n; i++) {
    const x = Math.round(((i + 0.2 + rnd() * 0.6) / n) * g.width);
    const [leaf, light] = pick(rnd, leaves);
    tree(g, x, mid[x]! + int(rnd, 1, 4), int(rnd, 3, 6), hex('#5a3828'), hex(leaf), hex(light));
  }
  const near = ridge(rnd, g.width, 44, 1, 40);
  g.fillBelow(near, hex('#86532f'));
  speckle(g, rnd, 50, near, 5, c('#e0632e', '#efa12e', '#c63d2b', '#a56a3c'));
  for (let i = 0; i < 18; i++)
    g.set(int(rnd, 0, g.width - 1), int(rnd, 4, 40), hex(pick(rnd, leaves)[0]));
};

const winter: Painter = (g, rnd) => {
  g.gradient(c('#9db3cc', '#b9c9db', '#d4dfea', '#e7edf3'), 0, 36);
  const range = peaks(rnd, g.width, 32, int(rnd, 4, 6), 10, 20);
  range.forEach((top, x) => {
    for (let y = top; y < g.height; y++)
      g.set(x, y, y - top < 3 && top < 26 ? hex('#f3f7fb') : hex('#8ea3ba'));
  });
  const mid = ridge(rnd, g.width, 36, 3, 26);
  g.fillBelow(mid, hex('#dde6ef'));
  g.edge(mid, hex('#f6f9fc'));
  for (let i = 0, n = int(rnd, 6, 9); i < n; i++) {
    const x = int(rnd, 3, g.width - 4);
    pine(g, x, mid[x]! + 2, int(rnd, 8, 13), hex('#3c5a58'), hex('#eef4f8'));
  }
  const near = ridge(rnd, g.width, 44, 2, 36);
  g.fillBelow(near, hex('#f1f5f9'));
  g.edge(near, hex('#c8d5e2'));
  for (let i = 0; i < 46; i++) g.set(int(rnd, 0, g.width - 1), int(rnd, 0, 46), hex('#ffffff'));
};

const sea: Painter = (g, rnd) => {
  const horizon = 28;
  g.gradient(c('#5ca6d8', '#88c2e6', '#bcdcef', '#f2e2c4'), 0, horizon);
  const sx = int(rnd, 24, g.width - 24);
  sun(g, sx, horizon - 6, 5, hex('#fff3c8'), hex('#fbe2a6'));
  clouds(g, rnd, 3, 5, 14, hex('#ffffff'), hex('#cfe2ef'));
  const ix = int(rnd, 10, g.width - 40);
  const island = ridge(rnd, 26, horizon - 3, 2, 8, 1);
  island.forEach((top, i) => {
    const fade = Math.min(i, 25 - i);
    if (fade > 1) g.rect(ix + i, top + Math.max(0, 4 - fade), 1, horizon, hex('#6d9caf'));
  });
  g.gradient(c('#5aaccf', '#3a8fbc', '#246f9e', '#195b86'), horizon, g.height);
  for (let y = horizon + 1; y < g.height; y += 2) {
    const half = Math.max(1, 6 - (y - horizon) / 4);
    g.rect(Math.round(sx - half + (y % 4) - 1), y, Math.round(half * 2), 1, hex('#ffe7a8'));
  }
  for (let i = 0; i < 40; i++) {
    const y = int(rnd, horizon + 2, g.height - 1);
    g.rect(
      int(rnd, 0, g.width - 1),
      y,
      int(rnd, 2, 2 + Math.floor((y - horizon) / 5)),
      1,
      hex('#a6d8ec'),
    );
  }
  const bx = int(rnd, 10, g.width - 20);
  const by = horizon + int(rnd, 4, 8);
  g.rect(bx, by, 9, 1, hex('#7b4a32'));
  g.rect(bx + 1, by + 1, 7, 1, hex('#5e3726'));
  for (let j = 0; j < 8; j++) g.rect(bx + 4, by - 8 + j, 1 + Math.floor(j / 2), 1, hex('#ffffff'));
  g.rect(bx + 3, by - 8, 1, 8, hex('#5e3726'));
  for (let i = 0; i < 3; i++) bird(g, int(rnd, 8, g.width - 8), int(rnd, 6, 18), hex('#3d5a72'));
};

const mountain: Painter = (g, rnd) => {
  g.gradient(c('#6aa3d8', '#90bce2', '#b9d4eb', '#dbe8f2'), 0, 40);
  clouds(g, rnd, 2, 6, 12, hex('#ffffff'), hex('#d0e1ee'));
  const layers: [number, number, number, string, string][] = [
    [26, 12, 22, '#9fb5cd', '#eef3f8'],
    [34, 10, 20, '#6e88a4', '#e2eaf3'],
    [42, 6, 14, '#4c6279', '#d4dee9'],
  ];
  for (const [base, min, max, rock, snow] of layers) {
    const tops = peaks(rnd, g.width, base, int(rnd, 4, 6), min, max);
    tops.forEach((top, x) => {
      for (let y = top; y < g.height; y++)
        g.set(x, y, y - top < 2 && base - top > min + 2 ? hex(snow) : hex(rock));
    });
  }
  const meadow = ridge(rnd, g.width, 46, 1, 30);
  g.fillBelow(meadow, hex('#5d8c53'));
  for (let i = 0, n = int(rnd, 4, 7); i < n; i++) {
    const x = int(rnd, 2, g.width - 3);
    pine(g, x, meadow[x]! + 1, int(rnd, 6, 10), hex('#2f5737'));
  }
  for (let i = 0; i < 4; i++) bird(g, int(rnd, 10, g.width - 10), int(rnd, 4, 14), hex('#36506a'));
};

const desert: Painter = (g, rnd) => {
  g.gradient(c('#5aa2d6', '#84bbe2', '#b4d4eb', '#f0dcb4'), 0, 40);
  sun(g, int(rnd, 16, g.width - 16), int(rnd, 8, 12), 5, hex('#fff5d2'), hex('#fde3a2'));
  const mx = int(rnd, 10, g.width - 50);
  const mw = int(rnd, 22, 34);
  const top = int(rnd, 16, 20);
  for (let y = top; y < 38; y++) {
    const spread = Math.floor((y - top) * 0.6);
    g.rect(mx - spread, y, mw + spread * 2, 1, hex('#c88a62'));
    g.rect(mx + mw + spread - 3, y, 3, 1, hex('#ad714d'));
  }
  const dunes: [number, number, string, string][] = [
    [32, 3, '#e6bd85', '#f1d3a3'],
    [38, 3, '#dba96b', '#ebc58f'],
    [44, 2, '#cf9657', '#e0b072'],
  ];
  dunes.forEach(([base, amp, sand, crest], i) => {
    const tops = ridge(rnd, g.width, base, amp, 28 - i * 4);
    g.fillBelow(tops, hex(sand));
    g.edge(tops, hex(crest));
    if (i === 1)
      for (let k = 0, n = int(rnd, 2, 4); k < n; k++) {
        const x = int(rnd, 4, g.width - 5);
        const h = int(rnd, 6, 10);
        const y = tops[x]! + 1;
        g.rect(x, y - h, 2, h, hex('#4f8a4b'));
        const arm = int(rnd, 2, h - 3);
        g.rect(x - 2, y - arm - 1, 2, 1, hex('#4f8a4b'));
        g.rect(x - 2, y - arm - 4, 1, 3, hex('#4f8a4b'));
        g.rect(x + 2, y - arm + 1, 2, 1, hex('#4f8a4b'));
        g.rect(x + 3, y - arm - 2, 1, 3, hex('#4f8a4b'));
      }
  });
};

const forest: Painter = (g, rnd) => {
  g.gradient(c('#a7d2c1', '#c2e1d1', '#d9eee1', '#e7f4ea'), 0, 40);
  sun(g, int(rnd, 20, g.width - 20), int(rnd, 8, 12), 4, hex('#fbf6dc'), hex('#eef3d6'));
  const layers: [number, number, number, string][] = [
    [30, 6, 10, '#8fbba6'],
    [36, 9, 14, '#5e997b'],
    [43, 12, 18, '#2f6a4f'],
  ];
  for (const [base, min, max, color] of layers) {
    const ground = ridge(rnd, g.width, base, 2, 30);
    g.fillBelow(ground, hex(color));
    for (let x = int(rnd, 0, 4); x < g.width; x += int(rnd, 4, 9))
      pine(g, x, ground[x]!, int(rnd, min, max), hex(color));
  }
  const floor = ridge(rnd, g.width, 47, 1, 30);
  g.fillBelow(floor, hex('#24533d'));
  for (let i = 0, n = int(rnd, 3, 6); i < n; i++) {
    const x = int(rnd, 3, g.width - 4);
    const y = floor[x]!;
    g.rect(x, y - 1, 1, 2, hex('#efe6d2'));
    g.rect(x - 1, y - 2, 3, 1, hex('#d84a3a'));
    g.set(x, y - 3, hex('#d84a3a'));
  }
};

const nightSky: Painter = (g, rnd) => {
  g.gradient(c('#0e1634', '#172250', '#243265', '#33487a'), 0, g.height);
  stars(g, rnd, 80, 38, c('#ffffff', '#ffeeb5', '#b9d0ff'));
  crescent(g, int(rnd, 14, g.width - 14), int(rnd, 9, 13), 6, hex('#fff3c6'));
  const sx = int(rnd, 20, g.width - 40);
  const sy = int(rnd, 4, 10);
  for (let i = 0; i < 12; i++)
    g.set(sx + i, sy + Math.floor(i / 2), i < 4 ? hex('#ffffff') : hex('#9fb4e6'));
  const far = ridge(rnd, g.width, 38, 4, 30);
  g.fillBelow(far, hex('#1b2547'));
  const near = ridge(rnd, g.width, 44, 2, 26);
  g.fillBelow(near, hex('#0d1430'));
  for (let i = 0, n = int(rnd, 5, 8); i < n; i++) {
    const x = int(rnd, 2, g.width - 3);
    pine(g, x, near[x]! + 1, int(rnd, 6, 11), hex('#0d1430'));
  }
  const hx = int(rnd, 10, g.width - 20);
  const hy = near[hx]!;
  g.rect(hx, hy - 5, 7, 6, hex('#0d1430'));
  for (let j = 0; j < 4; j++) g.rect(hx - 1 + j, hy - 6 - j, 9 - j * 2, 1, hex('#0d1430'));
  g.rect(hx + 2, hy - 3, 2, 2, hex('#ffd36b'));
};

const space: Painter = (g, rnd) => {
  g.gradient(c('#0c0922', '#151035', '#1d1648', '#140f33'), 0, g.height);
  const gas = field(rnd, g.width, g.height, 14);
  const detail = field(rnd, g.width, g.height, 5);
  const nebula = c('#2c2264', '#4a2f86', '#7a3d98', '#b0579e');
  for (let y = 0; y < g.height; y++)
    for (let x = 0; x < g.width; x++) {
      const v = gas(x, y) * 0.8 + detail(x, y) * 0.2;
      const level = Math.floor((v - 0.45) * 9 + bayer(x, y) - 0.5);
      if (level >= 0) g.set(x, y, nebula[Math.min(level, nebula.length - 1)]!);
    }
  stars(g, rnd, 110, g.height - 1, c('#ffffff', '#cfd8ff', '#ffe3b0', '#9fb0ff'));
  const px = int(rnd, 24, g.width - 24);
  const py = int(rnd, 18, 32);
  const r = int(rnd, 8, 10);
  const bands = c('#e3a65c', '#cc8649', '#e9b97a');
  for (let y = py - r; y <= py + r; y++)
    for (let x = px - r; x <= px + r; x++) {
      const dx = x - px;
      const dy = y - py;
      if (dx * dx + dy * dy > r * r + r * 0.8) continue;
      const shade = (dx + 1.5) ** 2 + (dy + 2) ** 2 > (r + 0.5) ** 2;
      g.set(x, y, shade ? hex('#9a5e35') : bands[Math.floor((y - py + r) / 3) % bands.length]!);
    }
  const rx = r * 1.9;
  const ry = r * 0.45;
  for (let y = py - r; y <= py + r; y++)
    for (let x = Math.floor(px - rx - 1); x <= px + rx + 1; x++) {
      const dx = x - px;
      const dy = y - py + dx * 0.18;
      const e = (dx / rx) ** 2 + (dy / ry) ** 2;
      const behind = dy < 0 && dx * dx + (y - py) ** 2 <= r * r + r * 0.8;
      if (e > 0.72 && e < 1.15 && !behind) g.set(x, y, e < 0.95 ? hex('#f2d8a2') : hex('#c9a874'));
    }
  const mx = px + (px < g.width / 2 ? int(rnd, 30, 50) : -int(rnd, 30, 50));
  const my = int(rnd, 8, 14);
  g.disc(mx, my, 3, hex('#b9c3d8'));
  g.set(mx + 1, my - 1, hex('#8e98b0'));
  g.set(mx - 1, my + 1, hex('#8e98b0'));
};

export const PAINTERS = {
  spring,
  summer,
  autumn,
  winter,
  sea,
  mountain,
  desert,
  forest,
  'night-sky': nightSky,
  space,
} as const satisfies Record<string, Painter>;
