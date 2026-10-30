/**
 * Serverless challenge codes. A code is a compact base64url blob; nothing but the puzzle, the difficulty,
 * an optional display name and (optionally) a finishing time / mistake count is ever encoded.
 *
 * Layout (bytes): [version=1][kind: 1=invite 2=result][diff][id:4][puzzle: 41 nibbles packed]
 *                 [hostTime:u24 secs, 0xFFFFFF = unfinished][hostMistakes][guestTime:u24][guestMistakes]
 *                 [nameLen][name utf8][name2Len][name2 utf8]
 */
import { DIFFICULTIES, type Difficulty } from '../engine/constants';
import { solve, hasUniqueSolution } from '../engine/solver';

export interface Challenge {
  kind: 'invite' | 'result';
  id: string; // 8 hex chars, links a result back to its invite
  difficulty: Difficulty;
  puzzle: number[];
  hostName: string; hostTime: number | null; hostMistakes: number | null;
  guestName: string; guestTime: number | null; guestMistakes: number | null;
}

export const APP_LINK = 'sudoku://play?c=';
export const WEB_LINK = 'https://mvinodk2082-glitch.github.io/sudoku-play/?c=';
export const APK_URL = 'https://github.com/mvinodk2082-glitch/Sudoku/releases/latest';
const NONE = 0xffffff;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const clip = (name: string) => {
  const enc = new TextEncoder();
  let n = name.trim().slice(0, 24);
  while (enc.encode(n).length > 40) n = n.slice(0, -1);
  return enc.encode(n);
};

export function newChallengeId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function encodeChallenge(c: Challenge): string {
  const out: number[] = [1, c.kind === 'invite' ? 1 : 2, DIFFICULTIES.indexOf(c.difficulty)];
  for (let i = 0; i < 8; i += 2) out.push(parseInt(c.id.slice(i, i + 2), 16));
  for (let i = 0; i < 81; i += 2) out.push((c.puzzle[i] << 4) | (c.puzzle[i + 1] ?? 0));
  const u24 = (ms: number | null) => { const v = ms === null ? NONE : Math.min(NONE - 1, Math.round(ms / 1000)); out.push(v >> 16, (v >> 8) & 255, v & 255); };
  u24(c.hostTime); out.push(c.hostMistakes ?? 255);
  u24(c.guestTime); out.push(c.guestMistakes ?? 255);
  for (const n of [clip(c.hostName), clip(c.guestName)]) { out.push(n.length); out.push(...n); }
  return b64(Uint8Array.from(out));
}

/** Decode and validate a code; accepts a bare code or any link containing c=CODE. Returns null if invalid. */
export function decodeChallenge(input: string): (Challenge & { solution: number[] }) | null {
  try {
    const m = input.trim().match(/[?&#]c=([A-Za-z0-9_-]+)/);
    const code = m ? m[1] : input.trim();
    if (!/^[A-Za-z0-9_-]{40,}$/.test(code)) return null;
    const b = unb64(code);
    if (b[0] !== 1 || (b[1] !== 1 && b[1] !== 2) || b[2] > 4) return null;
    const id = Array.from(b.slice(3, 7), (x) => x.toString(16).padStart(2, '0')).join('');
    const puzzle: number[] = [];
    for (let i = 0; i < 41; i++) { puzzle.push(b[7 + i] >> 4, b[7 + i] & 15); }
    puzzle.length = 81;
    if (puzzle.some((v) => v > 9) || !hasUniqueSolution(puzzle)) return null;
    let p = 48;
    const u24 = () => { const v = (b[p] << 16) | (b[p + 1] << 8) | b[p + 2]; p += 3; return v === NONE ? null : v * 1000; };
    const byte = () => { const v = b[p++]; return v === 255 ? null : v; };
    const hostTime = u24(), hostMistakes = byte(), guestTime = u24(), guestMistakes = byte();
    const dec = new TextDecoder();
    const str = () => { const n = b[p++] ?? 0; const s = dec.decode(b.slice(p, p + n)); p += n; return s; };
    const hostName = str(), guestName = str();
    return { kind: b[1] === 1 ? 'invite' : 'result', id, difficulty: DIFFICULTIES[b[2]], puzzle,
      hostName, hostTime, hostMistakes, guestName, guestTime, guestMistakes, solution: solve(puzzle)! };
  } catch {
    return null;
  }
}

export const challengeLink = (code: string) => `${WEB_LINK}${code}`;
export const appLink = (code: string) => `${APP_LINK}${code}`;

// ---- history ----
export interface ChallengeRecord {
  id: string; role: 'host' | 'guest'; difficulty: Difficulty; puzzle: string; date: number;
  opponent: string; myTime: number | null; myMistakes: number | null; theirTime: number | null; theirMistakes: number | null;
}
const HK = 'sudoku.challenges.v1';
export const loadChallenges = (): ChallengeRecord[] => { try { return JSON.parse(localStorage.getItem(HK) || '[]'); } catch { return []; } };
export function upsertChallenge(r: Partial<ChallengeRecord> & { id: string; role: 'host' | 'guest' }): ChallengeRecord[] {
  const list = loadChallenges();
  const i = list.findIndex((x) => x.id === r.id && x.role === r.role);
  const merged = { ...(i >= 0 ? list[i] : { date: Date.now(), opponent: '', myTime: null, myMistakes: null, theirTime: null, theirMistakes: null }), ...r } as ChallengeRecord;
  if (i >= 0) list[i] = merged; else list.unshift(merged);
  const out = list.slice(0, 100);
  localStorage.setItem(HK, JSON.stringify(out));
  return out;
}

// ---- no-repeat registry ----
const SK = 'sudoku.seen.v1';
export function loadSeen(d: Difficulty): string[] {
  try { return (JSON.parse(localStorage.getItem(SK) || '{}')[d] as string[]) ?? []; } catch { return []; }
}
export function markSeen(d: Difficulty, key: string) {
  let all: Record<string, string[]> = {};
  try { all = JSON.parse(localStorage.getItem(SK) || '{}'); } catch { /* reset */ }
  const list = all[d] ?? [];
  if (!list.includes(key)) list.push(key);
  all[d] = list.slice(-20000);
  try { localStorage.setItem(SK, JSON.stringify(all)); } catch { /* quota */ }
}
