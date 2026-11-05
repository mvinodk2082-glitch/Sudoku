import { describe, expect, it } from 'vitest';
import { canonicalKey } from '../canonical';
import { LEGENDS, RESERVED_KEYS, legendPuzzle } from '../legends';
import { countSolutions, solve } from '../solver';
import { generate } from '../generator';
import { mulberry32 } from '../rng';
import bank from '../bank.json';

describe('legend challenges', () => {
  for (const l of LEGENDS) {
    it(`${l.label} has a unique solution matching the stored grid`, () => {
      expect(l.puzzle).toHaveLength(81);
      expect(l.puzzle.filter(Boolean).length).toBeGreaterThanOrEqual(21);
      expect(countSolutions(l.puzzle, 2)).toBe(1);
      expect(solve(l.puzzle)).toEqual(l.solution);
      expect(l.key).toBe(canonicalKey(l.puzzle));
      expect(legendPuzzle(l.id)?.key).toBe(l.key);
    });
  }

  it('reserves every legend fingerprint and keeps them distinct', () => {
    expect(RESERVED_KEYS.size).toBe(LEGENDS.length);
    expect(new Set(LEGENDS.map((l) => l.key)).size).toBe(LEGENDS.length);
    for (const [, list] of Object.entries(bank as Record<string, string[][]>)) {
      for (const row of list) expect(RESERVED_KEYS.has(row[2])).toBe(false);
    }
  });

  it('random generation never regenerates a legend (or isomorphic copy)', () => {
    const rng = mulberry32(7);
    for (const d of ['Easy', 'Medium', 'Hard', 'Expert', 'Master'] as const) {
      for (let i = 0; i < 12; i++) {
        const p = generate(d, rng, 800, new Set());
        expect(RESERVED_KEYS.has(p.key)).toBe(false);
      }
    }
  }, 120_000);
});
