import { ALL, boxOf, colOf, rowOf, popcount } from './core';
import { Rng, shuffle } from './rng';

interface State { g: number[]; r: number[]; c: number[]; b: number[] }

function init(grid: number[]): State | null {
  const s: State = { g: grid.slice(), r: Array(9).fill(0), c: Array(9).fill(0), b: Array(9).fill(0) };
  for (let i = 0; i < 81; i++) {
    const v = s.g[i];
    if (!v) continue;
    const m = 1 << (v - 1), r = rowOf(i), c = colOf(i), b = boxOf(i);
    if ((s.r[r] | s.c[c] | s.b[b]) & m) return null; // conflict
    s.r[r] |= m; s.c[c] |= m; s.b[b] |= m;
  }
  return s;
}

/** Backtracking search with MRV. Calls onSolution for each solution; stop when it returns true. */
function search(s: State, rng: Rng | undefined, onSolution: (g: number[]) => boolean): boolean {
  let best = -1, bestMask = 0, bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (s.g[i]) continue;
    const m = ALL & ~(s.r[rowOf(i)] | s.c[colOf(i)] | s.b[boxOf(i)]);
    const n = popcount(m);
    if (n === 0) return false;
    if (n < bestCount) { best = i; bestMask = m; bestCount = n; if (n === 1) break; }
  }
  if (best < 0) return onSolution(s.g);
  const ds: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << (d - 1))) ds.push(d);
  if (rng) shuffle(ds, rng);
  const r = rowOf(best), c = colOf(best), b = boxOf(best);
  for (const d of ds) {
    const m = 1 << (d - 1);
    s.g[best] = d; s.r[r] |= m; s.c[c] |= m; s.b[b] |= m;
    if (search(s, rng, onSolution)) return true;
    s.r[r] &= ~m; s.c[c] &= ~m; s.b[b] &= ~m;
  }
  s.g[best] = 0;
  return false;
}

/** Count solutions, stopping at `limit` (2 is enough to test uniqueness). */
export function countSolutions(grid: number[], limit = 2): number {
  const s = init(grid);
  if (!s) return 0;
  let n = 0;
  search(s, undefined, () => ++n >= limit);
  return n;
}

export const hasUniqueSolution = (grid: number[]) => countSolutions(grid, 2) === 1;

/** Solve a grid (first solution found). With an rng the search order is randomised. */
export function solve(grid: number[], rng?: Rng): number[] | null {
  const s = init(grid);
  if (!s) return null;
  let out: number[] | null = null;
  search(s, rng, (g) => { out = g.slice(); return true; });
  return out;
}

export function isValidSolution(g: number[]): boolean {
  if (g.length !== 81 || g.some((v) => v < 1 || v > 9)) return false;
  return init(g) !== null;
}
