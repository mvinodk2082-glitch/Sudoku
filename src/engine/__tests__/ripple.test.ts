import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, initialPlay, reducer, rippleDelay } from '../../game/store';
import { inputFeel } from '../../haptics';
import { LOKI } from '../legends';

describe('digit-complete ripple', () => {
  const sol = LOKI.solution;
  // Board solved except two cells holding the same digit, in different rows, cols and boxes.
  const d = sol[0];
  const others = sol.map((v, i) => (v === d && i !== 0 ? i : -1)).filter((i) => i >= 0);
  const a = 0, b = others.find((i) => Math.floor(i / 9) > 2 && i % 9 > 2)!;
  const puzzle = sol.map((v, i) => (i === a || i === b ? 0 : v));

  it('glows all nine copies when the last one lands, rippling from that cell', () => {
    let s = reducer(initialPlay, { type: 'new', puzzle: { puzzle, solution: sol, difficulty: 'Master', clues: 79 }, daily: null });
    s = reducer({ ...s, selected: b }, { type: 'input', digit: d, settings: DEFAULT_SETTINGS });
    s = reducer({ ...s, selected: a }, { type: 'input', digit: d, settings: { ...DEFAULT_SETTINGS } });
    // won, but glow still records the digit
    const nine = sol.map((v, i) => (v === d ? i : -1)).filter((i) => i >= 0);
    for (const i of nine) expect(s.glow.cells).toContain(i);
    expect(s.glow.origin).toBe(a);
    expect(rippleDelay(a, a)).toBe(0);
    expect(rippleDelay(a, 80)).toBe(8 * 35);
    expect(rippleDelay(undefined, 80)).toBe(0);
  });

  it('plays the unit feel for the last copy of a digit', () => {
    const prev = { values: puzzle.map((v, i) => (i === b ? d : v)), solution: sol, notes: Array(81).fill(0) };
    // remove an unrelated cell so no row/col/box completes besides via digit
    const next = { ...prev, values: prev.values.map((v, i) => (i === a ? d : v)) };
    expect(inputFeel(prev, next, a, false)).toBe('unit');
  });
});
