export type Random = () => number;

export function seededRandom(seed: string): Random {
  let h = 2166136261;
  for (const char of seed) {
    h ^= char.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export const int = (rnd: Random, min: number, max: number): number =>
  min + Math.floor(rnd() * (max - min + 1));

export const pick = <T>(rnd: Random, items: readonly T[]): T =>
  items[Math.floor(rnd() * items.length)]!;
