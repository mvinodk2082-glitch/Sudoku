/**
 * Isomorphism-invariant fingerprint of a puzzle's givens.
 *
 * Sudoku "same combination" includes the 2·6^8·9! symmetry transforms (digit relabelling, row/column
 * swaps inside a band/stack, band/stack swaps, transposition — rotations/reflections are compositions of
 * these). Exact lexicographic canonicalisation over 3.4M transforms is too slow for a phone, so we use
 * colour refinement (Weisfeiler–Leman) on the puzzle's structure: every feature below is preserved by all
 * those transforms, so isomorphic puzzles ALWAYS get the same fingerprint; non-isomorphic puzzles colliding
 * is astronomically unlikely (verified empirically in the tests).
 */
import { BOXES, COLS, ROWS, boxOf, colOf, rowOf } from './core';

function fnv(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519) ^ (h2 >>> 13);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

function orientFingerprint(g: number[]): string {
  const band = (i: number) => Math.floor(rowOf(i) / 3), stack = (i: number) => Math.floor(colOf(i) / 3);
  const cnt = (cells: number[]) => cells.filter((c) => g[c]).length;
  const digitCount: Record<number, number> = {};
  g.forEach((v) => { if (v) digitCount[v] = (digitCount[v] ?? 0) + 1; });
  const bandCells = (b: number) => ROWS.slice(b * 3, b * 3 + 3).flat();
  const stackCells = (s: number) => COLS.slice(s * 3, s * 3 + 3).flat();
  // initial colour
  let col: string[] = g.map((v, i) =>
    [v ? 1 : 0, cnt(ROWS[rowOf(i)]), cnt(COLS[colOf(i)]), cnt(BOXES[boxOf(i)]), cnt(bandCells(band(i))), cnt(stackCells(stack(i))), v ? digitCount[v] : 0].join('.'));
  for (let round = 0; round < 3; round++) {
    // digit colour = multiset of cell colours holding it (relabel-invariant)
    const digitCol: Record<number, string> = {};
    for (let d = 1; d <= 9; d++) digitCol[d] = fnv(g.map((v, i) => (v === d ? col[i] : '')).filter(Boolean).sort().join('|'));
    const ms = (cells: number[], self: number) => cells.filter((c) => c !== self).map((c) => col[c]).sort().join(',');
    const next = g.map((v, i) => {
      const sameDigit = v ? g.map((w, j) => (w === v && j !== i ? `${col[j]}:${rowOf(j) === rowOf(i) ? 'r' : colOf(j) === colOf(i) ? 'c' : band(j) === band(i) ? 'b' : stack(j) === stack(i) ? 's' : 'n'}` : '')).filter(Boolean).sort().join(',') : '';
      return fnv([col[i], v ? digitCol[v] : '-', ms(ROWS[rowOf(i)], i), ms(COLS[colOf(i)], i), ms(BOXES[boxOf(i)], i),
        ms(bandCells(band(i)).filter((c) => rowOf(c) !== rowOf(i)), i), ms(stackCells(stack(i)).filter((c) => colOf(c) !== colOf(i)), i), sameDigit].join('/'));
    });
    col = next;
  }
  return fnv(col.slice().sort().join('|'));
}

const transpose = (g: number[]) => g.map((_, i) => g[colOf(i) * 9 + rowOf(i)]);

export function canonicalKey(puzzle: number[]): string {
  const a = orientFingerprint(puzzle), b = orientFingerprint(transpose(puzzle));
  return a < b ? a + b : b + a;
}
