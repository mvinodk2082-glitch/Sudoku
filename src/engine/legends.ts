/**
 * Famous record-hard Sudokus as fixed, always-replayable challenges.
 * Grids are the widely cited published forms; each has a unique solution
 * (verified in tests) and a reserved fingerprint so the random pool never
 * regenerates an isomorphic copy.
 */
import { canonicalKey } from './canonical';
import type { Puzzle } from './generator';

const parse = (s: string) => s.replace(/\./g, '0').split('').map(Number);

export interface Legend {
  id: string;
  label: string;
  credit: string;
  /** One-line source note kept in code for provenance. */
  source: string;
  puzzle: number[];
  solution: number[];
  key: string;
}

function legend(id: string, label: string, credit: string, source: string, givens: string, solution: string): Legend {
  const puzzle = parse(givens);
  return { id, label, credit, source, puzzle, solution: parse(solution), key: canonicalKey(puzzle) };
}

/** Arto Inkala, Nov 2006 — "AI Escargot". SudokuWiki.org/Escargot */
export const ESCARGOT = legend(
  'escargot', 'AI Escargot', 'Arto Inkala, 2006',
  'https://www.sudokuwiki.org/Escargot',
  '100007090030020008009600500005300900010080002600004000300000010040000007007000300',
  '162857493534129678789643521475312986913586742628794135356478219241935867897261354',
);

/** tarek, Jan 2007 — "Golden Nugget". Sudoku Snake / SE top lists */
export const NUGGET = legend(
  'nugget', 'Golden Nugget', 'tarek, 2007',
  'https://www.sudokusnake.com/goldennugget.php',
  '000000039000010005003005800008009006070020000100400000009008050020000600400700000',
  '751864239892317465643295871238179546974526318165483927319648752527931684486752193',
);

/** gsf's sudoku q1 — "Platinum Blonde". Common SE ~10.9 benchmark */
export const BLONDE = legend(
  'blonde', 'Platinum Blonde', 'gsf, ~2007',
  'attractivechaos/plb sudoku.txt (gsf q1); suuudokuuu.com/hardest-sudoku-puzzles/platinum-blonde',
  '.......12........3..23..4....18....5.6..7.8.......9.....85.....9...4.5..47...6...',
  '839465712146782953752391486391824675564173829287659341628537194913248567475916238',
);

/**
 * Arto Inkala, Aug 2010 — Daily Mail / The Guardian "World's Hardest".
 * Kept as the headline 2010 challenge from v1.6.
 */
export const INKALA = legend(
  'inkala', "World's Hardest", 'Arto Inkala, 2010',
  'https://www.theguardian.com/media/2010/aug/22/worlds-hardest-sudoku',
  '005300000800000020070010500400005300010070006003200080060500009004000030000009700',
  '145327698839654127672918543496185372218473956753296481367542819984761235521839764',
);

/** Arto Inkala, Jun 2012 — Telegraph "Everest" / AI Maze */
export const EVEREST = legend(
  'everest', 'Everest', 'Arto Inkala, 2012',
  'https://www.telegraph.co.uk/science/science-news/9359579/Worlds-hardest-sudoku-can-you-crack-it.html',
  '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
  '812753649943682175675491283154237896369845721287169534521974368438526917796318452',
);

/** Home-screen order: chronological by fame. */
export const LEGENDS: Legend[] = [ESCARGOT, NUGGET, BLONDE, INKALA, EVEREST];

export const RESERVED_KEYS = new Set(LEGENDS.map((l) => l.key));

export const legendById = (id: string | null | undefined) => LEGENDS.find((l) => l.id === id);

export function legendPuzzle(id: string): (Puzzle & { key: string }) | null {
  const l = legendById(id);
  if (!l) return null;
  return {
    puzzle: l.puzzle.slice(),
    solution: l.solution.slice(),
    difficulty: 'Master',
    clues: l.puzzle.filter(Boolean).length,
    key: l.key,
  };
}

/** @deprecated keep old import paths working during the 1.6→1.7 hop */
export const INKALA_ID = INKALA.id;
export const INKALA_CREDIT = INKALA.credit;
export const INKALA_LABEL = INKALA.label;
export const INKALA_PUZZLE = INKALA.puzzle;
export const INKALA_SOLUTION = INKALA.solution;
export const INKALA_KEY = INKALA.key;
export const inkalaPuzzle = () => legendPuzzle(INKALA.id)!;
