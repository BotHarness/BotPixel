// Renders the README banner and morph GIFs from the built packages.
// Usage: pnpm build && node scripts/readme-assets.mjs   (needs ffmpeg on PATH)
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AVATAR_PARTS,
  AVATAR_PRESETS,
  faceCells,
  pixelSymbolCells,
  pixelTileColor,
  seededRecipe,
} from '../packages/avatar/dist/index.js';
import { pixelFrame, planPixels } from '../packages/morph/dist/index.js';

const OUT = new URL('../assets/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const BG = '#1d1b22';
const GOLD = '#f2d675';
const INK = '#0f0e13';

const rgb = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

class Canvas {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 3);
    this.rect(0, 0, w, h, bg);
  }
  rect(x, y, w, h, color) {
    const [r, g, b] = rgb(color);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) {
        const o = (j * this.w + i) * 3;
        this.data[o] = r;
        this.data[o + 1] = g;
        this.data[o + 2] = b;
      }
  }
}

// the rounded 32×32 tile behind every avatar, the same shape the package clips to
const R = 6;
const inTile = (x, y) => {
  const clamp = (v) => Math.min(Math.max(v, R), 32 - R);
  return (x + 0.5 - clamp(x + 0.5)) ** 2 + (y + 0.5 - clamp(y + 0.5)) ** 2 <= R * R;
};
function drawTile(canvas, recipe, ox, oy, s) {
  const color = pixelTileColor(recipe.hairColor);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) if (inTile(x, y)) canvas.rect(ox + x * s, oy + y * s, s, s, color);
}
function drawCells(canvas, cells, ox, oy, s) {
  for (const c of cells) canvas.rect(ox + c.x * s, oy + c.y * s, s, s, c.c);
}
function drawAvatar(canvas, recipe, cells, ox, oy, s) {
  drawTile(canvas, recipe, ox, oy, s);
  drawCells(canvas, cells, ox, oy, s);
}

// a small hand-drawn pixel face for the wordmark
const GLYPHS = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
  t: ['00100', '00100', '11111', '00100', '00100', '00100', '00011'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  i: ['010', '000', '110', '010', '010', '010', '111'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01111'],
  l: ['110', '010', '010', '010', '010', '010', '111'],
};
function drawWord(canvas, word, cx, cy, s) {
  const width = [...word].reduce((sum, ch) => sum + GLYPHS[ch][0].length + 1, -1);
  const x = Math.round(cx - (width * s) / 2);
  const y = Math.round(cy - (7 * s) / 2);
  const edge = Math.round(s / 4);
  for (const pass of ['shadow', 'face'])
    [...word].reduce((gx, ch) => {
      GLYPHS[ch].forEach((row, j) =>
        [...row].forEach((bit, i) => {
          if (bit !== '1') return;
          const px = gx + i * s;
          const py = y + j * s;
          if (pass === 'shadow') canvas.rect(px + edge, py + edge, s, s, INK);
          else {
            canvas.rect(px, py, s, s, GOLD);
          }
        }),
      );
      return gx + (GLYPHS[ch][0].length + 1) * s;
    }, x);
}

function ffmpeg(args, input) {
  const run = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { input, maxBuffer: 1 << 30 });
  if (run.status !== 0) throw new Error(run.stderr.toString());
}
function savePng(canvas, name) {
  ffmpeg(
    ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${canvas.w}x${canvas.h}`, '-i', '-'].concat([
      '-frames:v',
      '1',
      fileURLToPath(new URL(name, OUT)),
    ]),
    canvas.data,
  );
}
function saveGif(frames, name, fps = 25) {
  const { w, h } = frames[0];
  ffmpeg(
    [
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${w}x${h}`,
      '-r',
      String(fps),
      '-i',
      '-',
      '-filter_complex',
      '[0]split[a][b];[a]palettegen=max_colors=255:stats_mode=full[p];[b][p]paletteuse=dither=none',
      '-loop',
      '0',
      fileURLToPath(new URL(name, OUT)),
    ],
    Buffer.concat(frames.map((f) => f.data)),
  );
}

// ---- the cast: presets plus name-seeded faces, with a few turned heads ----
const NAMES =
  'DeepSeekBot Ada Grace Linus Margaret Alan Barbara 小明 Rin Kai Mika Theo Juno Iris Otto Nova Sage Remy Luna Felix Hana Yuki Leo Mei Aria Zane Ivy Omar Nia Quinn Rex Tess Uma Vik Wren Yara Zed Bo Cy Dot Eli Fae Gus Hal Ida Jax Kit Lou Max Ned Oli Pip Roz Sol Tam Ula Vee Wes Xia Yen Zoe Ann Ben Cal Dee Eve Fox Gil Hob Ike Jo Ken Liv Mo Nan Ora Pia Ray Sue Tom Val Win Yo Zia Arlo Bea Cleo Dax Edda Finn Gwen Hugo Inez Jude Kira Lars Mila Nico'.split(
    ' ',
  );
const POSES = ['front', 'front', 'left', 'front', 'right'];
const cast = [
  ...AVATAR_PRESETS,
  ...NAMES.map((name, i) => ({ ...seededRecipe(name), pose: POSES[i % POSES.length] })),
];

// ---- banner: the wordmark in a hole, ringed by avatars ----
{
  const cell = 80;
  const s = 2;
  const cols = 16;
  const rows = 8;
  const banner = new Canvas(cols * cell, rows * cell, BG);
  let n = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (r >= 3 && r <= 4 && c >= 3 && c <= 12) continue;
      const recipe = cast[n++ % cast.length];
      const pad = (cell - 32 * s) / 2;
      drawAvatar(banner, recipe, faceCells(recipe), c * cell + pad, r * cell + pad, s);
    }
  drawWord(banner, 'BotPixel', banner.w / 2, banner.h / 2, 14);
  savePng(banner, 'banner.png');
}

// ---- morph timelines ----
const FPS = 25;
const MORPH = Math.round(0.8 * FPS);
// one avatar's script: hold the face, then morph through `keys`, holding each
function timeline(recipe, keys, hold) {
  const cellsFor = (key) =>
    key === 'face' ? faceCells(recipe) : pixelSymbolCells(key, recipe.hairColor);
  const frames = [];
  let current = cellsFor(keys[0]);
  for (let i = 0; i < hold[0]; i++) frames.push(current);
  for (let k = 1; k < keys.length; k++) {
    const next = cellsFor(keys[k]);
    const pairs = planPixels(current, next);
    for (let f = 1; f <= MORPH; f++) frames.push(f === MORPH ? next : pixelFrame(pairs, f / MORPH));
    current = next;
    for (let i = 0; i < (hold[k] ?? hold[1]); i++) frames.push(current);
  }
  return frames;
}

// 1. one avatar working through a turn: thinking, reading, editing, a shell, a search
{
  const recipe = AVATAR_PRESETS[2];
  const keys = ['face', 'thinking', 'read', 'edit', 'bash', 'search', 'face'];
  const tl = timeline(recipe, keys, [30, 18, 18, 18, 18, 18, 30]);
  const s = 8;
  const size = 32 * s + 32;
  saveGif(
    tl.map((cells) => {
      const c = new Canvas(size, size, BG);
      drawAvatar(c, recipe, cells, 16, 16, s);
      return c;
    }),
    'morph-turn.gif',
    FPS,
  );
}

// 2. a row of avatars, each on its own tool, out of step with each other
{
  const s = 4;
  const gap = 16;
  const crew = [0, 3, 5, 7, 9, 11].map((i) => AVATAR_PRESETS[i]);
  const tools = [
    ['face', 'web', 'fetch', 'face'],
    ['face', 'edit', 'approval', 'face'],
    ['face', 'search', 'read', 'face'],
    ['face', 'todo', 'write', 'face'],
    ['face', 'subagent', 'workflow', 'face'],
    ['face', 'thinking', 'present', 'face'],
  ];
  const lines = crew.map((recipe, i) => {
    const lead = Array(i * 8).fill(faceCells(recipe));
    return lead.concat(timeline(recipe, tools[i], [20, 22, 22, 20]));
  });
  const length = Math.max(...lines.map((l) => l.length)) + 20;
  const w = crew.length * (32 * s + gap) + gap;
  const h = 32 * s + gap * 2;
  const frames = [];
  for (let f = 0; f < length; f++) {
    const c = new Canvas(w, h, BG);
    crew.forEach((recipe, i) =>
      drawAvatar(
        c,
        recipe,
        lines[i][Math.min(f, lines[i].length - 1)],
        gap + i * (32 * s + gap),
        gap,
        s,
      ),
    );
    frames.push(c);
  }
  saveGif(frames, 'morph-crew.gif', FPS);
}

// 3. the engine alone: one face morphing into the next, nothing avatar-specific about it
{
  const s = 6;
  const faces = ['Ada', 'Kai', '小明', 'Luna', 'Ada'].map((name) => seededRecipe(name));
  const frames = [];
  for (let k = 0; k < faces.length - 1; k++) {
    const a = faces[k];
    const b = faces[k + 1];
    const pairs = planPixels(faceCells(a), faceCells(b));
    for (let i = 0; i < 18; i++) frames.push({ cells: faceCells(a), tile: a });
    for (let f = 1; f <= MORPH; f++)
      frames.push({ cells: pixelFrame(pairs, f / MORPH), tile: f < MORPH / 2 ? a : b });
  }
  const size = 32 * s + 32;
  saveGif(
    frames.map(({ cells, tile }) => {
      const c = new Canvas(size, size, BG);
      drawAvatar(c, tile, cells, 16, 16, s);
      return c;
    }),
    'morph-faces.gif',
    FPS,
  );
}

console.log(
  `rendered banner.png, morph-turn.gif, morph-crew.gif, morph-faces.gif (${AVATAR_PARTS.hair.length} hairstyles in the catalog)`,
);
