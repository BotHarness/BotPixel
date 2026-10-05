/** One coloured pixel on an integer grid. */
export interface PixelCell {
  x: number;
  y: number;
  c: string;
}

/** A planned flight from one source pixel to one target pixel. */
export interface PixelPair {
  from: PixelCell;
  to: PixelCell;
  delay: number;
  arc: number;
}

export interface PixelGridOptions {
  /** Width and height of the square grid, in pixels. Defaults to 32. */
  size?: number;
}

export interface PixelMorphRun {
  current(): PixelCell[];
  cancel(): void;
  finished: Promise<boolean>;
}

const STAGGER = 0.67;

/**
 * Pairs every pixel of `from` with one of `to`. Both sets are swept by angle around their own
 * centroid, then matched by proportional index, so neighbours fly to neighbours and the
 * smaller set is reused (pixels split or merge). Each pair gets a start delay (4×4 clumps,
 * top rows first, checkerboard offset) and an arc height of 2–4 pixels.
 */
export function planPixels(
  from: readonly PixelCell[],
  to: readonly PixelCell[],
  options: PixelGridOptions = {},
): PixelPair[] {
  const clumpRows = (options.size ?? 32) / 4;
  const sweep = (set: readonly PixelCell[]) => {
    const cx = set.reduce((sum, p) => sum + p.x, 0) / set.length;
    const cy = set.reduce((sum, p) => sum + p.y, 0) / set.length;
    return set
      .map((p) => ({ p, a: Math.atan2(p.y - cy, p.x - cx), r: Math.hypot(p.x - cx, p.y - cy) }))
      .sort((m, n) => m.a - n.a || m.r - n.r)
      .map((item) => item.p);
  };
  if (from.length === 0 || to.length === 0) return [];
  const source = sweep(from);
  const target = sweep(to);
  const count = Math.max(source.length, target.length);
  return Array.from({ length: count }, (_, index) => {
    const a = source[Math.floor((index * source.length) / count)]!;
    const b = target[Math.floor((index * target.length) / count)]!;
    const by = Math.floor(a.y / 4);
    const bx = Math.floor(a.x / 4);
    return {
      from: a,
      to: b,
      delay: (by / clumpRows) * 0.28 + ((bx + by) % 2) * 0.04,
      arc: 2 + ((bx * 3 + by) % 3),
    };
  });
}

const ease = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/**
 * The pixels shown at progress `t` (0–1): each pair eases along its path, hops by
 * `sin(kπ)·arc`, snaps to the grid and switches colour halfway. Later pairs win a shared cell.
 */
export function pixelFrame(
  pairs: readonly PixelPair[],
  t: number,
  options: PixelGridOptions = {},
): PixelCell[] {
  const size = options.size ?? 32;
  const grid = new Map<number, PixelCell>();
  for (const pair of pairs) {
    const k = ease((t - pair.delay) / STAGGER);
    const x = Math.round(pair.from.x + (pair.to.x - pair.from.x) * k);
    const y = Math.round(
      pair.from.y + (pair.to.y - pair.from.y) * k - Math.sin(k * Math.PI) * pair.arc,
    );
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    grid.set(y * size + x, { x, y, c: k < 0.5 ? pair.from.c : pair.to.c });
  }
  return [...grid.values()];
}

/** Escapes a value for a double-quoted XML attribute. */
export function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/gu, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * SVG `<rect>` markup for cells, merging horizontal runs of one colour. Colours are escaped,
 * so the markup is safe to assign to `innerHTML` whatever the cells contain.
 */
export function pixelMarkup(cells: readonly PixelCell[]): string {
  const rows = new Map<number, Map<number, string>>();
  for (const cell of cells) {
    let row = rows.get(cell.y);
    if (!row) rows.set(cell.y, (row = new Map()));
    row.set(cell.x, cell.c);
  }
  let markup = '';
  for (const [y, row] of rows) {
    const xs = [...row.keys()].sort((a, b) => a - b);
    for (let i = 0; i < xs.length;) {
      const x = xs[i]!;
      const color = row.get(x)!;
      let width = 1;
      while (xs[i + width] === x + width && row.get(x + width) === color) width++;
      markup += `<rect x="${x}" y="${y}" width="${width}" height="1" fill="${escapeAttribute(color)}"/>`;
      i += width;
    }
  }
  return markup;
}

const active = new WeakMap<SVGGElement, PixelMorphRun>();

/**
 * Plays a morph into an SVG group with `requestAnimationFrame`. `current()` returns the pixels
 * on screen, so a new morph can start from mid-flight. Starting a morph on a group cancels the
 * one already running there, so only the newest run draws.
 */
export function morphPixels(
  group: SVGGElement,
  from: readonly PixelCell[],
  to: readonly PixelCell[],
  duration: number,
  options: PixelGridOptions = {},
): PixelMorphRun {
  active.get(group)?.cancel();
  const pairs = planPixels(from, to, options);
  let frame = 0;
  let start = -1;
  let shown: PixelCell[] = [...from];
  let drawn = '';
  let settle: (done: boolean) => void = () => undefined;
  const finished = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  const tick = (time: number) => {
    if (start < 0) start = time;
    const t = Math.min(1, (time - start) / duration);
    shown = t >= 1 ? [...to] : pixelFrame(pairs, t, options);
    const markup = pixelMarkup(shown);
    if (markup !== drawn) group.innerHTML = drawn = markup;
    if (t >= 1) {
      frame = 0;
      if (active.get(group) === run) active.delete(group);
      settle(true);
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  const run: PixelMorphRun = {
    current: () => shown,
    cancel() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (active.get(group) === run) active.delete(group);
      settle(false);
    },
    finished,
  };
  active.set(group, run);
  frame = requestAnimationFrame(tick);
  return run;
}

/**
 * Cells from character art: each character is looked up in `palette`, and characters without
 * an entry are empty. `ox`/`oy` offset the art on the grid.
 */
export function cellsFromRows(
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  ox = 0,
  oy = 0,
): PixelCell[] {
  const cells: PixelCell[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((code, x) => {
      const c = palette[code];
      if (c) cells.push({ x: x + ox, y: y + oy, c });
    }),
  );
  return cells;
}
