import {
  ALL, BOXES, COLS, PEERS, ROWS, UNITS, Unit, bit, boxOf, cellName, colOf, digitsOf, isPeer,
  popcount, rowOf, unitName,
} from './core';

export type Technique =
  | 'Naked Single' | 'Hidden Single'
  | 'Naked Pair' | 'Hidden Pair' | 'Pointing' | 'Box/Line Reduction'
  | 'Naked Triple' | 'X-Wing' | 'XY-Wing';

export const TECHNIQUE_LEVEL: Record<Technique, number> = {
  'Naked Single': 1, 'Hidden Single': 1,
  'Naked Pair': 2, 'Hidden Pair': 2, Pointing: 2, 'Box/Line Reduction': 2,
  'Naked Triple': 3, 'X-Wing': 3, 'XY-Wing': 3,
};

export interface Elim { cell: number; digit: number }
export interface Step {
  technique: Technique;
  place?: { cell: number; digit: number };
  elims?: Elim[];
  cells: number[]; // cells that justify the step (for highlighting)
  text: string;
}

export function computeCandidates(grid: number[]): number[] {
  const cands = Array(81).fill(0);
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    let m = ALL;
    for (const p of PEERS[i]) if (grid[p]) m &= ~bit(grid[p]);
    cands[i] = m;
  }
  return cands;
}

const empties = (u: Unit, grid: number[]) => u.cells.filter((c) => !grid[c]);
const where = (cells: number[], cands: number[], d: number) => cells.filter((c) => cands[c] & bit(d));

function collectElims(targets: number[], mask: number, cands: number[], grid: number[]): Elim[] {
  const out: Elim[] = [];
  for (const t of targets) {
    if (grid[t]) continue;
    for (const d of digitsOf(cands[t] & mask)) out.push({ cell: t, digit: d });
  }
  return out;
}
const fmt = (cs: number[]) => cs.map(cellName).join(', ');

function nakedSingle(grid: number[], cands: number[]): Step | null {
  for (let i = 0; i < 81; i++) {
    if (!grid[i] && popcount(cands[i]) === 1) {
      const d = digitsOf(cands[i])[0];
      return { technique: 'Naked Single', place: { cell: i, digit: d }, cells: [i],
        text: `Naked single: ${cellName(i)} can only be ${d} (row ${rowOf(i) + 1}).` };
    }
  }
  return null;
}

function hiddenSingle(grid: number[], cands: number[]): Step | null {
  for (const u of [...BOXES.map((_, k) => UNITS[18 + k]), ...UNITS.slice(0, 18)]) {
    const e = empties(u, grid);
    for (let d = 1; d <= 9; d++) {
      const w = where(e, cands, d);
      if (w.length === 1) {
        return { technique: 'Hidden Single', place: { cell: w[0], digit: d }, cells: u.cells,
          text: `Hidden single in ${unitName(u)}: ${d} fits only at ${cellName(w[0])}.` };
      }
    }
  }
  return null;
}

function nakedSubset(grid: number[], cands: number[], size: 2 | 3): Step | null {
  for (const u of UNITS) {
    const e = empties(u, grid).filter((c) => popcount(cands[c]) <= size && popcount(cands[c]) >= 2);
    const combos: number[][] = [];
    if (size === 2) for (let a = 0; a < e.length; a++) for (let b = a + 1; b < e.length; b++) combos.push([e[a], e[b]]);
    else for (let a = 0; a < e.length; a++) for (let b = a + 1; b < e.length; b++) for (let c = b + 1; c < e.length; c++) combos.push([e[a], e[b], e[c]]);
    for (const combo of combos) {
      const m = combo.reduce((acc, c) => acc | cands[c], 0);
      if (popcount(m) !== size) continue;
      const others = u.cells.filter((c) => !combo.includes(c));
      const elims = collectElims(others, m, cands, grid);
      if (elims.length) {
        const technique = size === 2 ? 'Naked Pair' : 'Naked Triple';
        return { technique, elims, cells: combo,
          text: `${technique} {${digitsOf(m).join(',')}} at ${fmt(combo)} in ${unitName(u)}: remove those digits from the rest of the ${u.kind}.` };
      }
    }
  }
  return null;
}

function hiddenPair(grid: number[], cands: number[]): Step | null {
  for (const u of UNITS) {
    const e = empties(u, grid);
    for (let a = 1; a <= 9; a++) {
      const wa = where(e, cands, a);
      if (wa.length !== 2) continue;
      for (let b = a + 1; b <= 9; b++) {
        const wb = where(e, cands, b);
        if (wb.length !== 2 || wb[0] !== wa[0] || wb[1] !== wa[1]) continue;
        const keep = bit(a) | bit(b);
        const elims = collectElims(wa, ALL & ~keep, cands, grid);
        if (elims.length) {
          return { technique: 'Hidden Pair', elims, cells: wa,
            text: `Hidden pair {${a},${b}} in ${unitName(u)} at ${fmt(wa)}: other candidates there can go.` };
        }
      }
    }
  }
  return null;
}

function pointing(grid: number[], cands: number[]): Step | null {
  for (let bx = 0; bx < 9; bx++) {
    const e = BOXES[bx].filter((c) => !grid[c]);
    for (let d = 1; d <= 9; d++) {
      const w = where(e, cands, d);
      if (w.length < 2) continue;
      const rs = new Set(w.map(rowOf)), cs = new Set(w.map(colOf));
      let line: number[] | null = null, label = '';
      if (rs.size === 1) { line = ROWS[w[0] === undefined ? 0 : rowOf(w[0])]; label = `row ${rowOf(w[0]) + 1}`; }
      else if (cs.size === 1) { line = COLS[colOf(w[0])]; label = `column ${colOf(w[0]) + 1}`; }
      if (!line) continue;
      const elims = collectElims(line.filter((c) => boxOf(c) !== bx), bit(d), cands, grid);
      if (elims.length) {
        return { technique: 'Pointing', elims, cells: w,
          text: `Pointing: in box ${bx + 1}, ${d} must be in ${label}, so remove ${d} from the rest of ${label}.` };
      }
    }
  }
  return null;
}

function boxLine(grid: number[], cands: number[]): Step | null {
  for (const u of UNITS.slice(0, 18)) {
    const e = empties(u, grid);
    for (let d = 1; d <= 9; d++) {
      const w = where(e, cands, d);
      if (w.length < 2) continue;
      const bs = new Set(w.map(boxOf));
      if (bs.size !== 1) continue;
      const bx = boxOf(w[0]);
      const elims = collectElims(BOXES[bx].filter((c) => !u.cells.includes(c)), bit(d), cands, grid);
      if (elims.length) {
        return { technique: 'Box/Line Reduction', elims, cells: w,
          text: `Box/line reduction: in ${unitName(u)}, ${d} lies only in box ${bx + 1}, so remove ${d} from the rest of that box.` };
      }
    }
  }
  return null;
}

function xWing(grid: number[], cands: number[]): Step | null {
  for (const byRow of [true, false]) {
    const lines = byRow ? ROWS : COLS;
    const cross = byRow ? COLS : ROWS;
    const pos = byRow ? colOf : rowOf;
    for (let d = 1; d <= 9; d++) {
      const spots = lines.map((l) => where(l.filter((c) => !grid[c]), cands, d));
      for (let a = 0; a < 9; a++) {
        if (spots[a].length !== 2) continue;
        for (let b = a + 1; b < 9; b++) {
          if (spots[b].length !== 2) continue;
          const pa = spots[a].map(pos), pb = spots[b].map(pos);
          if (pa[0] !== pb[0] || pa[1] !== pb[1]) continue;
          const corners = [...spots[a], ...spots[b]];
          const targets = [...cross[pa[0]], ...cross[pa[1]]].filter((c) => !corners.includes(c));
          const elims = collectElims(targets, bit(d), cands, grid);
          if (elims.length) {
            const kind = byRow ? 'rows' : 'columns', other = byRow ? 'columns' : 'rows';
            return { technique: 'X-Wing', elims, cells: corners,
              text: `X-Wing on ${d} in ${kind} ${a + 1} and ${b + 1}: remove ${d} from the rest of ${other} ${pa[0] + 1} and ${pa[1] + 1}.` };
          }
        }
      }
    }
  }
  return null;
}

function xyWing(grid: number[], cands: number[]): Step | null {
  const bivalue = [] as number[];
  for (let i = 0; i < 81; i++) if (!grid[i] && popcount(cands[i]) === 2) bivalue.push(i);
  for (const p of bivalue) {
    const [a, b] = digitsOf(cands[p]);
    const wings = bivalue.filter((w) => w !== p && isPeer(p, w) && popcount(cands[w] & cands[p]) === 1);
    for (const w1 of wings) {
      if (!(cands[w1] & bit(a))) continue;
      const c = digitsOf(cands[w1] & ~bit(a))[0];
      for (const w2 of wings) {
        if (w2 === w1 || cands[w2] !== (bit(b) | bit(c))) continue;
        const targets = PEERS[w1].filter((t) => t !== p && t !== w2 && isPeer(t, w2));
        const elims = collectElims(targets, bit(c), cands, grid);
        if (elims.length) {
          return { technique: 'XY-Wing', elims, cells: [p, w1, w2],
            text: `XY-Wing: pivot ${cellName(p)} {${a},${b}} with wings ${cellName(w1)} and ${cellName(w2)}: ${c} can't be in cells seeing both wings.` };
        }
      }
    }
  }
  return null;
}

const FINDERS: ((g: number[], c: number[]) => Step | null)[] = [
  nakedSingle, hiddenSingle,
  (g, c) => nakedSubset(g, c, 2), hiddenPair, pointing, boxLine,
  (g, c) => nakedSubset(g, c, 3), xWing, xyWing,
];

/** Find the simplest next logical step, or null if none of the implemented techniques applies. */
export function findStep(grid: number[], cands: number[]): Step | null {
  for (const f of FINDERS) {
    const s = f(grid, cands);
    if (s) return s;
  }
  return null;
}

export function applyStep(grid: number[], cands: number[], s: Step) {
  if (s.place) {
    const { cell, digit } = s.place;
    grid[cell] = digit;
    cands[cell] = 0;
    for (const p of PEERS[cell]) cands[p] &= ~bit(digit);
  }
  for (const e of s.elims ?? []) cands[e.cell] &= ~bit(e.digit);
}

export interface LogicResult {
  solved: boolean;
  maxLevel: number;
  steps: Step[];
  used: Partial<Record<Technique, number>>;
  grid: number[];
}

export function logicalSolve(puzzle: number[], maxSteps = 2000): LogicResult {
  const grid = puzzle.slice();
  const cands = computeCandidates(grid);
  const steps: Step[] = [];
  const used: Partial<Record<Technique, number>> = {};
  let maxLevel = 0;
  while (steps.length < maxSteps && grid.includes(0)) {
    const s = findStep(grid, cands);
    if (!s) break;
    applyStep(grid, cands, s);
    steps.push(s);
    used[s.technique] = (used[s.technique] ?? 0) + 1;
    maxLevel = Math.max(maxLevel, TECHNIQUE_LEVEL[s.technique]);
  }
  return { solved: !grid.includes(0), maxLevel, steps, used, grid };
}

/** Next hint from a (correct) current board: walks eliminations until a placement appears. */
export function nextHint(grid: number[]): { place: { cell: number; digit: number }; steps: Step[] } | null {
  const g = grid.slice();
  const cands = computeCandidates(g);
  const steps: Step[] = [];
  for (let k = 0; k < 200; k++) {
    const s = findStep(g, cands);
    if (!s) return null;
    steps.push(s);
    if (s.place) return { place: s.place, steps };
    applyStep(g, cands, s);
  }
  return null;
}
