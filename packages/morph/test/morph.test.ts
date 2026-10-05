import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cellsFromRows,
  morphPixels,
  pixelFrame,
  pixelMarkup,
  pixelPathMarkup,
  planPixels,
  type PixelCell,
} from '../src/index.js';

const key = (cells: readonly PixelCell[]) =>
  cells
    .map((c) => `${c.x},${c.y},${c.c}`)
    .sort()
    .join(' ');
const square = cellsFromRows(['XX', 'XX'], { X: '#111111' }, 2, 2);
const bar = cellsFromRows(['YYYYYYYY'], { Y: '#eeeeee' }, 20, 25);

describe('planPixels and pixelFrame', () => {
  it('pairs the larger set fully and lands exactly on the target', () => {
    const pairs = planPixels(square, bar);
    expect(pairs).toHaveLength(8);
    expect(key(pixelFrame(pairs, 0))).toBe(key(square));
    expect(key(pixelFrame(pairs, 1.5))).toBe(key(bar));
  });

  it('stays on whole grid cells, inside the grid, with no duplicates', () => {
    const pairs = planPixels(square, bar);
    for (let t = 0; t <= 1; t += 0.05) {
      const frame = pixelFrame(pairs, t);
      expect(frame.every((c) => Number.isInteger(c.x) && Number.isInteger(c.y))).toBe(true);
      expect(frame.every((c) => c.x >= 0 && c.x < 32 && c.y >= 0 && c.y < 32)).toBe(true);
      expect(new Set(frame.map((c) => `${c.x},${c.y}`)).size).toBe(frame.length);
    }
  });

  it('clips to a custom grid size', () => {
    const far = cellsFromRows(['Z'], { Z: '#222222' }, 60, 60);
    const pairs = planPixels(square, far, { size: 64 });
    expect(key(pixelFrame(pairs, 2, { size: 64 }))).toBe(key(far));
    expect(pixelFrame(pairs, 2)).toEqual([]);
  });

  it('returns no pairs when either side is empty', () => {
    expect(planPixels([], bar)).toEqual([]);
    expect(planPixels(square, [])).toEqual([]);
  });
});

describe('pixelMarkup', () => {
  it('merges horizontal runs of one colour', () => {
    expect(pixelMarkup(cellsFromRows(['AAB'], { A: '#000000', B: '#ffffff' }))).toBe(
      '<rect x="0" y="0" width="2" height="1" fill="#000000"/><rect x="2" y="0" width="1" height="1" fill="#ffffff"/>',
    );
  });

  it('escapes colours so they cannot leave the fill attribute', () => {
    const markup = pixelMarkup([{ x: 0, y: 0, c: '"/><script>alert(1)</script><rect fill="' }]);
    expect(markup).not.toContain('<script');
    expect(markup.match(/"/gu)).toHaveLength(10);
  });

  it('skips cells whose coordinates are not finite numbers', () => {
    const hostile = { x: '0" onload="alert(1)', y: 0, c: '#000000' } as unknown as PixelCell;
    expect(pixelMarkup([hostile, { x: 1, y: Number.NaN, c: '#000000' }])).toBe('');
  });
});

describe('pixelPathMarkup', () => {
  it('draws one path per colour covering the same runs', () => {
    expect(pixelPathMarkup(cellsFromRows(['AAB', 'A'], { A: '#000000', B: '#ffffff' }))).toBe(
      '<path fill="#000000" d="M0 0h2v1h-2zM0 1h1v1h-1z"/><path fill="#ffffff" d="M2 0h1v1h-1z"/>',
    );
  });

  it('escapes colours and skips non-finite coordinates like pixelMarkup', () => {
    const hostile = { x: '0" onload="alert(1)', y: 0, c: '#000000' } as unknown as PixelCell;
    expect(pixelPathMarkup([hostile, { x: 1, y: Number.NaN, c: '#000000' }])).toBe('');
    const markup = pixelPathMarkup([{ x: 0, y: 0, c: '"/><script>alert(1)</script><path fill="' }]);
    expect(markup).not.toContain('<script');
  });
});

describe('morphPixels', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('draws frames until the target and can be cancelled mid-flight', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const step = (time: number) => callbacks.shift()!(time);
    const group = { innerHTML: '' } as unknown as SVGGElement;

    const run = morphPixels(group, square, bar, 100);
    step(0);
    step(50);
    expect(group.innerHTML).not.toBe(pixelMarkup(bar));
    step(100);
    await expect(run.finished).resolves.toBe(true);
    expect(group.innerHTML).toBe(pixelMarkup(bar));

    const again = morphPixels(group, bar, square, 100);
    step(0);
    step(40);
    const shown = again.current();
    again.cancel();
    await expect(again.finished).resolves.toBe(false);
    expect(shown.length).toBeGreaterThan(0);
  });

  it('lets only the newest run on a group draw', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      callbacks[id - 1] = () => undefined;
    });
    const group = { innerHTML: '' } as unknown as SVGGElement;
    const first = morphPixels(group, square, bar, 100);
    callbacks[0]!(0);
    const second = morphPixels(group, first.current(), square, 100);
    await expect(first.finished).resolves.toBe(false);
    for (let i = 1, time = 0; i < callbacks.length; i++, time += 50) callbacks[i]!(time);
    await expect(second.finished).resolves.toBe(true);
    expect(group.innerHTML).toBe(pixelMarkup(square));
  });

  it('steps at frameMs and draws with the chosen markup', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    let writes = 0;
    let html = '';
    const group = {
      get innerHTML() {
        return html;
      },
      set innerHTML(value: string) {
        writes++;
        html = value;
      },
    } as unknown as SVGGElement;
    const run = morphPixels(group, square, bar, 800, { frameMs: 50, markup: pixelPathMarkup });
    for (let time = 0; callbacks.length; time += 1000 / 60) callbacks.shift()!(time);
    await expect(run.finished).resolves.toBe(true);
    expect(writes).toBeLessThanOrEqual(800 / 50 + 1);
    expect(group.innerHTML).toBe(pixelPathMarkup(bar));
  });

  it('drives every running morph from one shared animation frame', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const groups = Array.from({ length: 8 }, () => ({ innerHTML: '' }) as unknown as SVGGElement);
    const runs = groups.map((group) => morphPixels(group, square, bar, 100));
    expect(callbacks).toHaveLength(1);
    let requests = 0;
    for (let time = 0; callbacks.length; time += 50, requests++) callbacks.shift()!(time);
    await expect(Promise.all(runs.map((run) => run.finished))).resolves.toEqual(
      runs.map(() => true),
    );
    expect(requests).toBe(3);
    expect(groups.every((group) => group.innerHTML === pixelMarkup(bar))).toBe(true);
  });
});
