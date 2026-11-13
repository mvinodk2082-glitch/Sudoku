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

/** JPF, Apr 2007 — "Easter Monster" (21 givens). Logically solved by Hanson & Marans, 2008 */
export const EASTER = legend(
  'easter', 'Easter Monster', 'JPF, 2007',
  'https://www.sudokusnake.com/eastermonster.php; suuudokuuu.com/hardest-sudoku-puzzles/easter-monster',
  '100000002090400050006000700050903000000070000000850040700000600030009080002000001',
  '174385962293467158586192734451923876928674315367851249719548623635219487842736591',
);

/** "Red Dwarf" (22 givens) — from the Sudoku Players' Forum hardest-list canon; benchmark grid in attractivechaos/plb */
export const RED_DWARF = legend(
  'reddwarf', 'Red Dwarf', "Players' Forum hardest list",
  'https://github.com/attractivechaos/plb/blob/master/sudoku/sudoku.txt (Red Dwarf)',
  '12.3....435....1....4........54..2..6...7.........8.9...31..5.......9.7.....6...8',
  '126395784359847162874621953985416237631972845247538691763184529418259376592763418',
);

/** "Fata Morgana" (21 givens) — Players' Forum hardest-list canon; famously brutal for backtracking/DLX solvers (Allan Barker's set-logic study) */
export const FATA_MORGANA = legend(
  'fatamorgana', 'Fata Morgana', "Players' Forum hardest list",
  'https://sudoku.allanbarker.com/sweb/extra/fm/a_fm.htm; attractivechaos/plb sudoku.txt (Fata Morgana)',
  '........3..1..56...9..4..7......9.5.7.......8.5.4.2....8..2..9...35..1..6........',
  '562987413471235689398146275236819754714653928859472361187324596923568147645791832',
);

/** "Cheese" (23 givens) — Players' Forum hardest-list canon; benchmark grid in attractivechaos/plb */
export const CHEESE = legend(
  'cheese', 'Cheese', "Players' Forum hardest list",
  'https://github.com/attractivechaos/plb/blob/master/sudoku/sudoku.txt (Cheese)',
  '.2..5.7..4..1....68....3...2....8..3.4..2.5.....6...1...2.9.....9......57.4...9..',
  '123456789457189236869273154271548693346921578985637412512394867698712345734865921',
);

/** mith (Philip Newman), Mar 2022 — "Loki", SER 11.9; first known puzzle beyond T&E(2), solved via the trivalue oddagon (tridagon) */
export const LOKI = legend(
  'loki', 'Loki', 'mith, 2022',
  'http://forum.enjoysudoku.com/loki-ser-11-9-t39840.html; github.com/denis-berthier/Classifications-of-TE3-Sudokus',
  '57....9..........8.1.........168..4......28.9..2.9416.....2.....6.9.82.4...41.6..',
  '576843921493261578218759436951687342647132859832594167184326795365978214729415683',
);

/** Newest addition: gets a quiet pulse dot on home until first opened. */
export const NEWEST_LEGEND = LOKI.id;

/** Home-screen order: chronological by fame. */
export const LEGENDS: Legend[] = [ESCARGOT, EASTER, NUGGET, BLONDE, RED_DWARF, FATA_MORGANA, CHEESE, INKALA, EVEREST, LOKI];

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
