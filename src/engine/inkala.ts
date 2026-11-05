/**
 * Arto Inkala's "World's Hardest Sudoku", published August 2010
 * (Daily Mail / The Guardian). 23 clues, unique solution, SE rating ~11.
 * Grid as reported by The Guardian:
 *   https://www.theguardian.com/media/2010/aug/22/worlds-hardest-sudoku
 */
import { canonicalKey } from './canonical';
import type { Puzzle } from './generator';

const GIVENS =
  '005300000' +
  '800000020' +
  '070010500' +
  '400005300' +
  '010070006' +
  '003200080' +
  '060500009' +
  '004000030' +
  '000009700';

const SOLUTION =
  '145327698' +
  '839654127' +
  '672918543' +
  '496185372' +
  '218473956' +
  '753296481' +
  '367542819' +
  '984761235' +
  '521839764';

const parse = (s: string) => s.split('').map(Number);

export const INKALA_ID = 'inkala';
export const INKALA_CREDIT = 'Arto Inkala, 2010';
export const INKALA_LABEL = "World's Hardest";
export const INKALA_PUZZLE = parse(GIVENS);
export const INKALA_SOLUTION = parse(SOLUTION);
export const INKALA_KEY = canonicalKey(INKALA_PUZZLE);

/** Fingerprints reserved so the random pool never regenerates this famous grid (or an isomorphic copy). */
export const RESERVED_KEYS = new Set([INKALA_KEY]);

export function inkalaPuzzle(): Puzzle & { key: string } {
  return {
    puzzle: INKALA_PUZZLE.slice(),
    solution: INKALA_SOLUTION.slice(),
    difficulty: 'Master',
    clues: INKALA_PUZZLE.filter(Boolean).length,
    key: INKALA_KEY,
  };
}
