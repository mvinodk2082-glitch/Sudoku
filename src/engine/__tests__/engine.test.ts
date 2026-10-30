import { describe, expect, it } from 'vitest';
import { parse, PEERS } from '../core';
import { countSolutions, hasUniqueSolution, isValidSolution, solve } from '../solver';
import { computeCandidates, findStep, logicalSolve, nextHint } from '../logic';
import { DIFFICULTIES, carve, dailyPuzzle, generate, generateSolved, grade, transform } from '../generator';
import { mulberry32 } from '../rng';

const EASY = parse('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
const EASY_SOL = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
// Classic hard puzzle that needs search beyond our technique set
const HARDEST = parse('8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..');

describe('solver', () => {
  it('solves a known puzzle', () => {
    expect(solve(EASY)!.join('')).toBe(EASY_SOL);
  });
  it('solves a very hard puzzle and it is unique', () => {
    const s = solve(HARDEST)!;
    expect(isValidSolution(s)).toBe(true);
    expect(countSolutions(HARDEST)).toBe(1);
  });
  it('detects multiple solutions and conflicts', () => {
    expect(countSolutions(Array(81).fill(0), 2)).toBe(2);
    const bad = EASY.slice(); bad[2] = 5; // duplicate 5 in row 1
    expect(countSolutions(bad)).toBe(0);
  });
  it('generates valid random full grids', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 20; i++) expect(isValidSolution(generateSolved(rng))).toBe(true);
  });
});

describe('logical solver', () => {
  it('solves an easy puzzle with singles only', () => {
    const r = logicalSolve(EASY);
    expect(r.solved).toBe(true);
    expect(r.maxLevel).toBe(1);
    expect(r.grid.join('')).toBe(EASY_SOL);
  });
  it('never makes a wrong deduction on generated puzzles', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 40; i++) {
      const sol = generateSolved(rng);
      const p = carve(sol, rng);
      const r = logicalSolve(p);
      r.grid.forEach((v, k) => { if (v) expect(v).toBe(sol[k]); });
      // candidates must still contain the true digit
      const cands = computeCandidates(r.grid);
      r.grid.forEach((v, k) => { if (!v) expect(cands[k] & (1 << (sol[k] - 1))).toBeTruthy(); });
    }
  });
  it('fails gracefully on puzzles beyond its techniques', () => {
    expect(logicalSolve(HARDEST).solved).toBe(false);
    expect(grade(HARDEST)).toBe('Master');
  });
  it('hints name a technique and give a correct digit', () => {
    const h = nextHint(EASY)!;
    expect(h.steps[0].technique).toMatch(/Single/);
    expect(h.place.digit).toBe(+EASY_SOL[h.place.cell]);
    expect(findStep(EASY, computeCandidates(EASY))!.text.length).toBeGreaterThan(10);
  });
});

describe('generator', () => {
  it('carves symmetric puzzles with a unique solution', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 25; i++) {
      const sol = generateSolved(rng);
      const p = carve(sol, rng);
      expect(hasUniqueSolution(p)).toBe(true);
      for (let k = 0; k < 81; k++) expect(!!p[k]).toBe(!!p[80 - k]);
      p.forEach((v, k) => { if (v) expect(v).toBe(sol[k]); });
    }
  });
  for (const d of DIFFICULTIES) {
    it(`generates ${d} puzzles that grade as ${d} and are unique`, () => {
      const rng = mulberry32(d.length * 97);
      for (let i = 0; i < 6; i++) {
        const t0 = Date.now();
        const p = generate(d, rng);
        expect(Date.now() - t0).toBeLessThan(3000);
        expect(hasUniqueSolution(p.puzzle)).toBe(true);
        expect(solve(p.puzzle)!.join('')).toBe(p.solution.join(''));
        expect(grade(p.puzzle)).toBe(d);
      }
    });
  }
  it('easy has more clues than medium', () => {
    const rng = mulberry32(3);
    expect(generate('Easy', rng).clues).toBeGreaterThanOrEqual(36);
    expect(generate('Medium', rng).clues).toBeLessThan(36);
  });
  it('transform preserves uniqueness and grade', () => {
    const rng = mulberry32(9);
    const p = generate('Hard', rng);
    const t = transform(p.puzzle, p.solution, rng);
    expect(hasUniqueSolution(t.puzzle)).toBe(true);
    expect(isValidSolution(t.solution)).toBe(true);
    expect(grade(t.puzzle)).toBe('Hard');
  });
  it('daily puzzle is deterministic per date', () => {
    const a = dailyPuzzle('2026-10-30'), b = dailyPuzzle('2026-10-30'), c = dailyPuzzle('2026-10-31');
    expect(a.puzzle).toEqual(b.puzzle);
    expect(a.puzzle).not.toEqual(c.puzzle);
    expect(hasUniqueSolution(a.puzzle)).toBe(true);
  });
  it('peers are 20 per cell', () => {
    expect(PEERS.every((p) => p.length === 20)).toBe(true);
  });
});
