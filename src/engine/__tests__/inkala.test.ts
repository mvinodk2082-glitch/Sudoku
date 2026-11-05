import { describe, expect, it } from 'vitest';
import { canonicalKey } from '../canonical';
import { INKALA_KEY, INKALA_PUZZLE, INKALA_SOLUTION, RESERVED_KEYS, inkalaPuzzle } from '../inkala';
import { countSolutions, solve } from '../solver';
import { generate } from '../generator';
import { mulberry32 } from '../rng';
import bank from '../bank.json';

describe('Inkala 2010', () => {
  it('matches the Guardian/Daily Mail grid and has a unique solution', () => {
    expect(INKALA_PUZZLE.filter(Boolean)).toHaveLength(23);
    expect(countSolutions(INKALA_PUZZLE, 2)).toBe(1);
    expect(solve(INKALA_PUZZLE)).toEqual(INKALA_SOLUTION);
    expect(INKALA_KEY).toBe(canonicalKey(INKALA_PUZZLE));
    const p = inkalaPuzzle();
    expect(p.key).toBe(INKALA_KEY);
    expect(p.difficulty).toBe('Master');
    expect(p.puzzle).not.toBe(INKALA_PUZZLE); // defensive copy
  });

  it('is reserved so random levels never regenerate it (or an isomorphic copy)', () => {
    expect(RESERVED_KEYS.has(INKALA_KEY)).toBe(true);
    for (const [, list] of Object.entries(bank as Record<string, string[][]>)) {
      for (const row of list) expect(row[2]).not.toBe(INKALA_KEY);
    }
    const rng = mulberry32(42);
    for (const d of ['Easy', 'Medium', 'Hard', 'Expert', 'Master'] as const) {
      for (let i = 0; i < 20; i++) {
        const p = generate(d, rng, 800, new Set());
        expect(p.key).not.toBe(INKALA_KEY);
      }
    }
  }, 120_000);
});
