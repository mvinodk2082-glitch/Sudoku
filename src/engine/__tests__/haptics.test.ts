import { describe, expect, it } from 'vitest';
import { WEB_PATTERN, inputFeel, makeThrottle, normalizeLevel } from '../../haptics';

const sol = Array.from({ length: 81 }, (_, i) => ((Math.floor(i / 9) * 3 + Math.floor(i / 27) + (i % 9)) % 9) + 1);
const board = (blank: number[]) => ({ values: sol.map((v, i) => (blank.includes(i) ? 0 : v)), solution: sol, notes: Array(81).fill(0) });

describe('haptic event mapping', () => {
  it('maps placements', () => {
    const prev = board([0, 1, 40]);
    const ok = { ...prev, values: prev.values.map((v, i) => (i === 40 ? sol[40] : v)) };
    expect(inputFeel(prev, ok, 40, false)).toBe('unit'); // 40 was the only gap in its row/col/box
    const prev2 = board([0, 1, 2, 9]);
    const ok2 = { ...prev2, values: prev2.values.map((v, i) => (i === 0 ? sol[0] : v)) };
    expect(inputFeel(prev2, ok2, 0, false)).toBe('place');
    const bad = { ...prev2, values: prev2.values.map((v, i) => (i === 0 ? (sol[0] % 9) + 1 : v)) };
    expect(inputFeel(prev2, bad, 0, false)).toBe('wrong');
    expect(inputFeel(prev, ok, 40, true)).toBe('solved');
  });
  it('maps notes, erase and no-ops', () => {
    const prev = board([0]);
    expect(inputFeel(prev, { ...prev, notes: prev.notes.map((n, i) => (i === 0 ? 4 : n)) }, 0, false)).toBe('note');
    expect(inputFeel(prev, prev, 0, false)).toBeNull();
    const filled = board([]);
    expect(inputFeel(filled, prev, 0, false)).toBe('low');
  });
});

describe('haptic throttle', () => {
  it('drops rapid repeats but keeps important feels', () => {
    const g = makeThrottle();
    expect(g('select', 0)).toBe(true);
    expect(g('select', 20)).toBe(false);
    expect(g('select', 80)).toBe(true);
    expect(g('wrong', 85)).toBe(true);
    expect(g('wrong', 90)).toBe(true);
    expect(g('select', 150)).toBe(false); // swallowed right after a richer feel
    expect(g('select', 300)).toBe(true);
  });
  it('migrates the old boolean setting and keeps web pulses short', () => {
    expect([normalizeLevel(true), normalizeLevel(false), normalizeLevel(undefined), normalizeLevel('strong')]).toEqual(['subtle', 'off', 'subtle', 'strong']);
    for (const p of Object.values(WEB_PATTERN)) p?.forEach((ms, i) => { if (i % 2 === 0) expect(ms).toBeLessThanOrEqual(12); });
  });
});
