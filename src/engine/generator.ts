import { stringify } from './core';
import { logicalSolve } from './logic';
import { Rng, mulberry32, shuffle } from './rng';
import { countSolutions, solve } from './solver';
import bank from './bank.json';

import { DIFFICULTIES, type Difficulty, dailyKey } from './constants';
export { DIFFICULTIES, dailyKey };
export type { Difficulty };

export interface Puzzle { puzzle: number[]; solution: number[]; difficulty: Difficulty; clues: number }

/** Grade by the hardest technique a human-style solver needs (clue count only splits Easy/Medium). */
export function grade(puzzle: number[]): Difficulty {
  const r = logicalSolve(puzzle);
  if (!r.solved) return 'Master';
  if (r.maxLevel >= 3) return 'Expert';
  if (r.maxLevel === 2) return 'Hard';
  const clues = puzzle.filter(Boolean).length;
  return clues >= 36 ? 'Easy' : 'Medium';
}

export function generateSolved(rng: Rng): number[] {
  return solve(Array(81).fill(0), rng)!;
}

/** Remove clues in 180°-symmetric pairs, keeping only removals that leave a unique solution. */
export function carve(solution: number[], rng: Rng, minClues = 17): number[] {
  const p = solution.slice();
  const order = shuffle([...Array(41).keys()], rng);
  let clues = 81;
  for (const i of order) {
    const j = 80 - i;
    const pair = i === j ? [i] : [i, j];
    if (clues - pair.length < minClues) continue;
    const saved = pair.map((k) => p[k]);
    pair.forEach((k) => (p[k] = 0));
    if (countSolutions(p, 2) !== 1) pair.forEach((k, n) => (p[k] = saved[n]));
    else clues -= pair.length;
  }
  return p;
}

/** Add symmetric clue pairs back from the solution until at least `target` clues. */
function addClues(p: number[], solution: number[], target: number, rng: Rng) {
  const empty = shuffle([...Array(41).keys()].filter((i) => !p[i] || !p[80 - i]), rng);
  for (const i of empty) {
    if (p.filter(Boolean).length >= target) break;
    p[i] = solution[i];
    p[80 - i] = solution[80 - i];
  }
}

/** Random validity-preserving transform (digit relabel, row/col permutations in bands, transpose). */
export function transform(puzzle: number[], solution: number[], rng: Rng) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  const perm = () => {
    const bands = shuffle([0, 1, 2], rng);
    return bands.flatMap((b) => shuffle([0, 1, 2], rng).map((r) => b * 3 + r));
  };
  const rows = perm(), cols = perm(), tr = rng() < 0.5;
  const map = (g: number[]) => {
    const out = Array(81).fill(0);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const v = g[rows[r] * 9 + cols[c]];
      out[tr ? c * 9 + r : r * 9 + c] = v ? digits[v - 1] : 0;
    }
    return out;
  };
  return { puzzle: map(puzzle), solution: map(solution) };
}

const fromString = (s: string) => s.split('').map((ch) => (ch === '.' ? 0 : +ch));

/**
 * Generate a puzzle of the requested difficulty. Easy–Hard are carved live (fast).
 * Expert/Master are rare under random carving, so after a short live budget we fall back to a
 * precomputed bank (made by this same generator, see scripts/build-bank.ts) plus a random transform,
 * which preserves both uniqueness and difficulty.
 */
export function generate(difficulty: Difficulty, rng: Rng = Math.random, budgetMs = 1500): Puzzle {
  const start = Date.now();
  const live = difficulty === 'Easy' || difficulty === 'Medium' || difficulty === 'Hard';
  let tries = 0;
  while (live || (Date.now() - start < budgetMs && tries < 12)) {
    tries++;
    const solution = generateSolved(rng);
    const p = carve(solution, rng);
    const g = grade(p);
    if (difficulty === 'Easy' && (g === 'Easy' || g === 'Medium')) {
      addClues(p, solution, 38 + Math.floor(rng() * 4), rng);
      return { puzzle: p, solution, difficulty, clues: p.filter(Boolean).length };
    }
    if (g === difficulty) return { puzzle: p, solution, difficulty, clues: p.filter(Boolean).length };
    if (live && tries > 400) break; // practically unreachable safety valve
  }
  const list = (bank as Record<string, string[][]>)[difficulty];
  const [ps, ss] = list[Math.floor(rng() * list.length)];
  const t = transform(fromString(ps), fromString(ss), rng);
  return { ...t, difficulty, clues: t.puzzle.filter(Boolean).length };
}

/** Same puzzle for everyone on a given date: deterministic seed from the date string. */
export function dailyPuzzle(key: string): Puzzle {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rng = mulberry32(h >>> 0);
  const diff: Difficulty = (['Medium', 'Hard', 'Hard', 'Expert'] as const)[Math.floor(rng() * 4)];
  return generate(diff, rng, 0);
}

export { stringify };
