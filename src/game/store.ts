import { normalizeLevel, type HapticLevel } from '../haptics';
import { BOXES, COLS, PEERS, ROWS, boxOf, cellName, colOf, rowOf } from '../engine/core';
import type { Difficulty, Puzzle } from '../engine/generator';
import { nextHint } from '../engine/logic';

export interface Game {
  id: string; difficulty: Difficulty; daily: string | null;
  puzzle: number[]; solution: number[]; values: number[]; notes: number[];
  mistakes: number; hints: number; elapsed: number; status: 'playing' | 'won' | 'lost';
  challenge?: GameChallenge;
}
export interface GameChallenge { id: string; role: 'host' | 'guest'; opponent: string; theirTime: number | null; theirMistakes: number | null }
export interface Settings {
  theme: string; mistakeCheck: boolean; mistakeLimit: boolean; haptics: HapticLevel;
  highlightSame: boolean; autoNotes: boolean; showTimer: boolean; playerName: string;
}
export const DEFAULT_SETTINGS: Settings = {
  theme: 'sage', mistakeCheck: true, mistakeLimit: true, haptics: 'subtle', highlightSame: true, autoNotes: true, showTimer: true, playerName: '',
};
export const MAX_MISTAKES = 3;

interface Snapshot { values: number[]; notes: number[] }
export interface PlayState {
  game: Game | null; selected: number; notesMode: boolean; paused: boolean;
  past: Snapshot[]; future: Snapshot[];
  message: { text: string; tone: 'info' | 'hint' | 'error' } | null;
  hintCells: number[]; glow: { cells: number[]; key: number }; pop: { cell: number; key: number }; shake: number;
}

export type Action =
  | { type: 'new'; puzzle: Puzzle; daily: string | null; challenge?: GameChallenge }
  | { type: 'setChallenge'; challenge: GameChallenge }
  | { type: 'load'; game: Game }
  | { type: 'select'; cell: number }
  | { type: 'move'; dr: number; dc: number }
  | { type: 'input'; digit: number; settings: Settings }
  | { type: 'erase' }
  | { type: 'notes' }
  | { type: 'undo' } | { type: 'redo' }
  | { type: 'hint'; settings: Settings }
  | { type: 'tick'; ms: number }
  | { type: 'pause'; paused: boolean }
  | { type: 'restart' }
  | { type: 'clearMessage' };

export const initialPlay: PlayState = {
  game: null, selected: -1, notesMode: false, paused: false, past: [], future: [], message: null,
  hintCells: [], glow: { cells: [], key: 0 }, pop: { cell: -1, key: 0 }, shake: 0,
};

const snap = (g: Game): Snapshot => ({ values: g.values.slice(), notes: g.notes.slice() });

function completedUnits(g: Game, cell: number): number[] {
  const out: number[] = [];
  for (const u of [ROWS[rowOf(cell)], COLS[colOf(cell)], BOXES[boxOf(cell)]]) {
    if (u.every((c) => g.values[c] === g.solution[c])) out.push(...u);
  }
  return out;
}
const isWon = (g: Game) => g.values.every((v, i) => v === g.solution[i]);

function place(s: PlayState, cell: number, digit: number, settings: Settings, fromHint = false): PlayState {
  const g = s.game!;
  const values = g.values.slice(), notes = g.notes.slice();
  values[cell] = digit;
  notes[cell] = 0;
  if (settings.autoNotes) for (const p of PEERS[cell]) notes[p] &= ~(1 << (digit - 1));
  const wrong = digit !== g.solution[cell];
  let mistakes = g.mistakes;
  if (wrong && settings.mistakeCheck && !fromHint) mistakes++;
  let game: Game = { ...g, values, notes, mistakes };
  let message = s.message;
  if (isWon(game)) game = { ...game, status: 'won' };
  else if (wrong && settings.mistakeCheck && settings.mistakeLimit && mistakes >= MAX_MISTAKES) game = { ...game, status: 'lost' };
  else if (!values.includes(0) && !settings.mistakeCheck) message = { text: 'The board is full, but something isn’t right yet.', tone: 'error' };
  const glowCells = wrong ? [] : completedUnits(game, cell);
  return {
    ...s, game, past: [...s.past, snap(g)].slice(-300), future: [], message,
    glow: glowCells.length ? { cells: glowCells, key: s.glow.key + 1 } : s.glow,
    pop: { cell, key: s.pop.key + 1 },
    shake: wrong && settings.mistakeCheck ? s.shake + 1 : s.shake,
  };
}

export function reducer(s: PlayState, a: Action): PlayState {
  if (a.type === 'new') {
    const { puzzle, solution, difficulty } = a.puzzle;
    const game: Game = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, difficulty, daily: a.daily,
      puzzle, solution, values: puzzle.slice(), notes: Array(81).fill(0), mistakes: 0, hints: 0, elapsed: 0, status: 'playing', challenge: a.challenge,
    };
    return { ...initialPlay, game, selected: puzzle.findIndex((v) => !v) };
  }
  if (a.type === 'load') return { ...initialPlay, game: a.game, selected: a.game.values.findIndex((v) => !v), paused: false };
  const g = s.game;
  if (!g) return s;
  switch (a.type) {
    case 'select': return { ...s, selected: a.cell, hintCells: [] };
    case 'move': {
      const cur = s.selected < 0 ? 40 : s.selected;
      const r = (rowOf(cur) + a.dr + 9) % 9, c = (colOf(cur) + a.dc + 9) % 9;
      return { ...s, selected: r * 9 + c };
    }
    case 'tick': return g.status === 'playing' && !s.paused ? { ...s, game: { ...g, elapsed: g.elapsed + a.ms } } : s;
    case 'pause': return { ...s, paused: a.paused };
    case 'setChallenge': return { ...s, game: { ...g, challenge: a.challenge } };
    case 'clearMessage': return { ...s, message: null, hintCells: [] };
    case 'restart':
      return { ...initialPlay, game: { ...g, values: g.puzzle.slice(), notes: Array(81).fill(0), mistakes: 0, hints: 0, elapsed: 0, status: 'playing' } };
  }
  if (g.status !== 'playing' || s.paused) return s;
  switch (a.type) {
    case 'notes': return { ...s, notesMode: !s.notesMode };
    case 'input': {
      const i = s.selected;
      if (i < 0 || g.puzzle[i]) return s;
      if (g.values[i] === g.solution[i] && g.values[i]) return s; // correct cells are locked
      if (s.notesMode) {
        if (g.values[i]) return s;
        const notes = g.notes.slice();
        notes[i] ^= 1 << (a.digit - 1);
        return { ...s, game: { ...g, notes }, past: [...s.past, snap(g)].slice(-300), future: [] };
      }
      if (g.values[i] === a.digit) return s;
      return place({ ...s, message: null, hintCells: [] }, i, a.digit, a.settings);
    }
    case 'erase': {
      const i = s.selected;
      if (i < 0 || g.puzzle[i] || (g.values[i] && g.values[i] === g.solution[i])) return s;
      if (!g.values[i] && !g.notes[i]) return s;
      const values = g.values.slice(), notes = g.notes.slice();
      values[i] = 0; notes[i] = 0;
      return { ...s, game: { ...g, values, notes }, past: [...s.past, snap(g)].slice(-300), future: [] };
    }
    case 'undo': {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return { ...s, game: { ...g, ...prev }, past: s.past.slice(0, -1), future: [snap(g), ...s.future] };
    }
    case 'redo': {
      const next = s.future[0];
      if (!next) return s;
      return { ...s, game: { ...g, ...next }, past: [...s.past, snap(g)], future: s.future.slice(1) };
    }
    case 'hint': {
      const wrong = g.values.findIndex((v, i) => v && v !== g.solution[i]);
      if (wrong >= 0) {
        return { ...s, selected: wrong, hintCells: [wrong],
          message: { text: `${cellName(wrong)} doesn’t fit the solution — erase it first.`, tone: 'error' } };
      }
      const h = nextHint(g.values);
      const counted = { ...g, hints: g.hints + 1 };
      if (!h) {
        const target = s.selected >= 0 && !g.values[s.selected] ? s.selected : g.values.findIndex((v) => !v);
        const next = place({ ...s, game: counted }, target, g.solution[target], a.settings, true);
        return { ...next, selected: target, hintCells: [target],
          message: { text: `No technique in the hint book applies here, so ${cellName(target)} was revealed.`, tone: 'hint' } };
      }
      const last = h.steps[h.steps.length - 1];
      const pre = h.steps.slice(0, -1).map((st) => st.technique);
      const prefix = pre.length ? `After ${[...new Set(pre)].join(' + ')} eliminations: ` : '';
      const next = place({ ...s, game: counted }, h.place.cell, h.place.digit, a.settings, true);
      return { ...next, selected: h.place.cell, hintCells: last.cells,
        message: { text: `${prefix}${last.text}`, tone: 'hint' } };
    }
  }
  return s;
}

// ---- persistence ----
const K = { game: 'sudoku.game.v1', settings: 'sudoku.settings.v1', stats: 'sudoku.stats.v1' };
const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
};
export const loadGame = (): Game | null => {
  try { const v = localStorage.getItem(K.game); return v ? JSON.parse(v) : null; } catch { return null; }
};
export const saveGame = (g: Game | null) => {
  try { g ? localStorage.setItem(K.game, JSON.stringify(g)) : localStorage.removeItem(K.game); } catch { /* quota */ }
};
export const loadSettings = (): Settings => { const s = read<Settings>(K.settings, DEFAULT_SETTINGS); return { ...s, haptics: normalizeLevel(s.haptics) }; };
export const saveSettings = (s: Settings) => localStorage.setItem(K.settings, JSON.stringify(s));

export interface DiffStats { played: number; won: number; totalTime: number; best: number | null; streak: number; bestStreak: number }
export interface Stats { byDiff: Record<Difficulty, DiffStats>; daily: Record<string, number>; counted: string[] }
const emptyDiff = (): DiffStats => ({ played: 0, won: 0, totalTime: 0, best: null, streak: 0, bestStreak: 0 });
export const emptyStats = (): Stats => ({
  byDiff: { Easy: emptyDiff(), Medium: emptyDiff(), Hard: emptyDiff(), Expert: emptyDiff(), Master: emptyDiff() },
  daily: {}, counted: [],
});
export const loadStats = (): Stats => {
  const s = read<Stats>(K.stats, emptyStats());
  return { ...emptyStats(), ...s, byDiff: { ...emptyStats().byDiff, ...s.byDiff } };
};
export const saveStats = (s: Stats) => localStorage.setItem(K.stats, JSON.stringify(s));

/** Record a finished (or abandoned) game exactly once. */
export function recordResult(stats: Stats, g: Game, won: boolean): Stats {
  if (stats.counted.includes(g.id)) return stats;
  const d = { ...stats.byDiff[g.difficulty] };
  d.played++;
  if (won) {
    d.won++; d.totalTime += g.elapsed; d.best = d.best === null ? g.elapsed : Math.min(d.best, g.elapsed);
    d.streak++; d.bestStreak = Math.max(d.bestStreak, d.streak);
  } else d.streak = 0;
  const daily = { ...stats.daily };
  if (won && g.daily && daily[g.daily] === undefined) daily[g.daily] = g.elapsed;
  return { byDiff: { ...stats.byDiff, [g.difficulty]: d }, daily, counted: [...stats.counted, g.id].slice(-500) };
}

export function dailyStreaks(daily: Record<string, number>, today: string) {
  const days = new Set(Object.keys(daily));
  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [y, m, dd] = today.split('-').map(Number);
  const cur = new Date(y, m - 1, dd);
  if (!days.has(today)) cur.setDate(cur.getDate() - 1);
  let current = 0;
  while (days.has(toKey(cur))) { current++; cur.setDate(cur.getDate() - 1); }
  const sorted = [...days].sort();
  let best = 0, run = 0, prev: Date | null = null;
  for (const k of sorted) {
    const [a, b, c] = k.split('-').map(Number);
    const d = new Date(a, b - 1, c);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return { current, best };
}

export const fmtTime = (ms: number) => {
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
