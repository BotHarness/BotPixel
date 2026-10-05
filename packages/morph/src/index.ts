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

export interface PixelMorphOptions extends PixelGridOptions {
  /**
   * Advance the morph in steps of this many milliseconds, computing and drawing a frame only
   * when the step changes (50 gives a pixel-art 20 fps). 0, the default, draws every display frame.
   */
  frameMs?: number;
  /** Turns cells into SVG markup. Defaults to `pixelMarkup`; `pixelPathMarkup` creates fewer nodes. */
  markup?: (cells: readonly PixelCell[]) => string;
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

/** Walks cells row by row, merging horizontal runs of one colour, and skips non-finite coordinates. */
function colourRuns(
  cells: readonly PixelCell[],
  emit: (x: number, y: number, width: number, colour: string) => void,
): void {
  const rows = new Map<number, Map<number, string>>();
  for (const cell of cells) {
    if (!Number.isFinite(cell.x) || !Number.isFinite(cell.y)) continue;
    let row = rows.get(cell.y);
    if (!row) rows.set(cell.y, (row = new Map()));
    row.set(cell.x, cell.c);
  }
  for (const [y, row] of rows) {
    const xs = [...row.keys()].sort((a, b) => a - b);
    for (let i = 0; i < xs.length;) {
      const x = xs[i]!;
      const colour = row.get(x)!;
      let width = 1;
      while (xs[i + width] === x + width && row.get(x + width) === colour) width++;
      emit(x, y, width, colour);
      i += width;
    }
  }
}

/**
 * SVG `<rect>` markup for cells, merging horizontal runs of one colour. Colours are escaped and
 * cells whose coordinates are not finite numbers are skipped, so the markup is safe to assign to
 * `innerHTML` whatever the cells contain.
 */
export function pixelMarkup(cells: readonly PixelCell[]): string {
  let markup = '';
  colourRuns(cells, (x, y, width, colour) => {
    markup += `<rect x="${x}" y="${y}" width="${width}" height="1" fill="${escapeAttribute(colour)}"/>`;
  });
  return markup;
}

/**
 * The same pixels as `pixelMarkup`, drawn as one `<path>` per colour. A frame becomes a handful
 * of SVG nodes instead of one per run, which keeps many simultaneous morphs cheap. Escaping and
 * coordinate checks match `pixelMarkup`.
 */
export function pixelPathMarkup(cells: readonly PixelCell[]): string {
  const paths = new Map<string, string>();
  colourRuns(cells, (x, y, width, colour) => {
    paths.set(colour, `${paths.get(colour) ?? ''}M${x} ${y}h${width}v1h-${width}z`);
  });
  let markup = '';
  for (const [colour, d] of paths) markup += `<path fill="${escapeAttribute(colour)}" d="${d}"/>`;
  return markup;
}

const active = new WeakMap<SVGGElement, PixelMorphRun>();
const tickers = new Set<(time: number) => void>();
let loopId = 0;

function loop(time: number): void {
  for (const tick of [...tickers]) tick(time);
  loopId = tickers.size > 0 ? requestAnimationFrame(loop) : 0;
}

function addTicker(tick: (time: number) => void): void {
  tickers.add(tick);
  if (loopId === 0) loopId = requestAnimationFrame(loop);
}

function removeTicker(tick: (time: number) => void): void {
  tickers.delete(tick);
  if (tickers.size === 0 && loopId !== 0) {
    cancelAnimationFrame(loopId);
    loopId = 0;
  }
}

/**
 * Plays a morph into an SVG group. Every running morph shares one `requestAnimationFrame` loop. `current()` returns the pixels
 * on screen, so a new morph can start from mid-flight. `frameMs` steps the morph at a fixed
 * rate and `markup` chooses the renderer. Starting a morph on a group cancels the
 * one already running there, so only the newest run draws.
 */
export function morphPixels(
  group: SVGGElement,
  from: readonly PixelCell[],
  to: readonly PixelCell[],
  duration: number,
  options: PixelMorphOptions = {},
): PixelMorphRun {
  active.get(group)?.cancel();
  const pairs = planPixels(from, to, options);
  const frameMs = options.frameMs ?? 0;
  const render = options.markup ?? pixelMarkup;
  let start = -1;
  let step = -1;
  let shown: PixelCell[] = [...from];
  let drawn = '';
  let settle: (done: boolean) => void = () => undefined;
  const finished = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  const stop = (done: boolean) => {
    removeTicker(tick);
    if (active.get(group) === run) active.delete(group);
    settle(done);
  };
  function tick(time: number): void {
    if (start < 0) start = time;
    const elapsed = time - start;
    const next = frameMs > 0 ? Math.floor(elapsed / frameMs) : elapsed;
    const t =
      elapsed >= duration ? 1 : Math.min(1, (frameMs > 0 ? next * frameMs : elapsed) / duration);
    if (next === step && t < 1) return;
    step = next;
    shown = t >= 1 ? [...to] : pixelFrame(pairs, t, options);
    const markup = render(shown);
    if (markup !== drawn) group.innerHTML = drawn = markup;
    if (t >= 1) stop(true);
  }
  const run: PixelMorphRun = {
    current: () => shown,
    cancel: () => stop(false),
    finished,
  };
  active.set(group, run);
  addTicker(tick);
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
