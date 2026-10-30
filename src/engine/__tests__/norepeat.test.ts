import { describe, expect, it } from 'vitest';
import { canonicalKey } from '../canonical';
import { DIFFICULTIES, carve, generate, generateSolved, transform } from '../generator';
import { mulberry32 } from '../rng';
import bank from '../bank.json';
import { encodeChallenge, decodeChallenge } from '../../game/challenge';

const fromString = (s: string) => s.split('').map((ch) => (ch === '.' ? 0 : +ch));
const rotate = (g: number[]) => g.map((_, i) => g[(8 - (i % 9)) * 9 + Math.floor(i / 9)]);

describe('canonical key', () => {
  it('is invariant under relabelling, permutations, transposition and rotation', () => {
    const rng = mulberry32(11);
    for (let k = 0; k < 30; k++) {
      const sol = generateSolved(rng);
      const p = carve(sol, rng);
      const key = canonicalKey(p);
      for (let t = 0; t < 5; t++) expect(canonicalKey(transform(p, sol, rng).puzzle)).toBe(key);
      expect(canonicalKey(rotate(p))).toBe(key);
      expect(canonicalKey(rotate(rotate(p)))).toBe(key);
      expect(canonicalKey(p.slice().reverse())).toBe(key); // 180° rotation
    }
  });
  it('separates different puzzles (no collisions in 2000 random puzzles)', () => {
    const rng = mulberry32(5);
    const keys = new Set<string>();
    for (let k = 0; k < 2000; k++) { const s = generateSolved(rng); keys.add(canonicalKey(carve(s, rng))); }
    expect(keys.size).toBe(2000);
  }, 120_000);
  it('separates puzzles that differ by a single clue', () => {
    const rng = mulberry32(8);
    const sol = generateSolved(rng);
    const p = carve(sol, rng);
    const i = p.findIndex((v) => !v);
    const q = p.slice(); q[i] = sol[i];
    expect(canonicalKey(q)).not.toBe(canonicalKey(p));
  });
  it('bank is canonically deduplicated', () => {
    for (const d of ['Expert', 'Master']) {
      const list = (bank as Record<string, string[][]>)[d];
      expect(list.length).toBeGreaterThanOrEqual(500);
      expect(new Set(list.map(([p]) => canonicalKey(fromString(p)))).size).toBe(list.length);
      for (const [p, , k] of list.slice(0, 50)) expect(canonicalKey(fromString(p))).toBe(k);
    }
  }, 120_000);
});

describe('no repeats', () => {
  for (const d of DIFFICULTIES) {
    it(`500 ${d} draws are all distinct combinations`, () => {
      const rng = mulberry32(1000 + d.length);
      const seen = new Set<string>();
      for (let k = 0; k < 500; k++) {
        const p = generate(d, rng, 2500, seen);
        expect(seen.has(p.key)).toBe(false);
        expect(canonicalKey(p.puzzle)).toBe(p.key);
        seen.add(p.key);
      }
      expect(seen.size).toBe(500);
    }, 240_000);
  }
  it('exhausted bank falls back to live generation', () => {
    const seen = new Set((bank as Record<string, string[][]>).Master.map(([p]) => canonicalKey(fromString(p))));
    const p = generate('Master', mulberry32(3), 0, seen);
    expect(seen.has(p.key)).toBe(false);
  }, 60_000);
});

describe('challenge codes', () => {
  it('round-trip invites and results and reject junk', () => {
    const p = generate('Hard', mulberry32(2));
    const code = encodeChallenge({ kind: 'invite', id: 'a1b2c3d4', difficulty: 'Hard', puzzle: p.puzzle,
      hostName: 'Vinod ✓', hostTime: 272000, hostMistakes: 1, guestName: '', guestTime: null, guestMistakes: null });
    expect(code.length).toBeLessThan(100);
    const c = decodeChallenge(`sudoku://play?c=${code}`)!;
    expect(decodeChallenge(`https://mvinodk2082-glitch.github.io/sudoku-play/?c=${code}`)?.id).toBe(c.id);
    expect(c.kind).toBe('invite');
    expect(c.puzzle).toEqual(p.puzzle);
    expect(c.solution).toEqual(p.solution);
    expect([c.hostName, c.hostTime, c.hostMistakes, c.guestTime]).toEqual(['Vinod ✓', 272000, 1, null]);
    const r = decodeChallenge(encodeChallenge({ ...c, kind: 'result', guestName: 'Asha', guestTime: 250000, guestMistakes: 0 }))!;
    expect([r.kind, r.id, r.guestName, r.guestTime, r.guestMistakes]).toEqual(['result', 'a1b2c3d4', 'Asha', 250000, 0]);
    expect(decodeChallenge('hello')).toBeNull();
    expect(decodeChallenge(code.slice(0, 30) + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBeNull();
  });
});
