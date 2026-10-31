import { Capacitor, registerPlugin } from '@capacitor/core';
import { BOXES, COLS, ROWS, boxOf, colOf, rowOf } from './engine/core';

export type Feel = 'select' | 'place' | 'note' | 'low' | 'wrong' | 'unit' | 'solved' | 'key';
export type HapticLevel = 'off' | 'subtle' | 'strong';

/** Minimum gap per feel so fast taps/drags never turn into a buzz. Important feels always play. */
export const MIN_GAP: Record<Feel, number> = { select: 45, key: 45, low: 60, note: 50, place: 35, wrong: 0, unit: 0, solved: 0 };
const PRIORITY: Record<Feel, number> = { select: 0, key: 0, low: 1, note: 1, place: 2, wrong: 3, unit: 3, solved: 4 };

/** Throttle: returns a gate function that says whether a feel may play at time t (ms). */
export function makeThrottle() {
  let last = -Infinity, lastFeel: Feel | null = null;
  const lastBy: Partial<Record<Feel, number>> = {};
  return (feel: Feel, t: number): boolean => {
    // A richer feel just played (e.g. 'unit' after 'place'); swallow trivial feels right after it.
    if (lastFeel && PRIORITY[lastFeel] > PRIORITY[feel] && t - last < 120) return false;
    if (t - (lastBy[feel] ?? -Infinity) < MIN_GAP[feel]) return false;
    lastBy[feel] = t; last = t; lastFeel = feel;
    return true;
  };
}

interface G { values: number[]; solution: number[]; notes: number[] }
const full = (vals: number[], sol: number[], cells: number[]) => cells.every((i) => vals[i] && vals[i] === sol[i]);

/** Work out how a digit entry should feel by comparing the board before and after. */
export function inputFeel(prev: G, next: G, cell: number, won: boolean): Feel | null {
  if (won) return 'solved';
  if (prev.values[cell] === next.values[cell]) return prev.notes[cell] !== next.notes[cell] ? 'note' : null;
  const v = next.values[cell];
  if (!v) return 'low';
  if (v !== next.solution[cell]) return 'wrong';
  const units = [ROWS[rowOf(cell)], COLS[colOf(cell)], BOXES[boxOf(cell)]];
  if (units.some((u) => full(next.values, next.solution, u) && !full(prev.values, prev.solution, u))) return 'unit';
  return 'place';
}

/** Migrate the pre-1.5 boolean setting. */
export function normalizeLevel(v: unknown): HapticLevel {
  if (v === 'off' || v === 'subtle' || v === 'strong') return v;
  if (v === false) return 'off';
  return 'subtle';
}

/** Web: navigator.vibrate is crude (on/off motor, no amplitude), so web stays silent on Subtle and only
 *  uses 5–12 ms pulses on Strong. */
export const WEB_PATTERN: Record<Feel, number[] | null> = {
  select: null, key: null, low: [5], note: [5], place: [8], wrong: [6, 60, 6], unit: [6, 40, 8, 40, 10], solved: [8, 60, 12, 120, 8],
};

const Native = registerPlugin<{ play(o: { feel: Feel; strong: boolean }): Promise<void> }>('PixelHaptics');
const gate = makeThrottle();

export function haptic(feel: Feel | null, level: HapticLevel) {
  if (!feel || level === 'off') return;
  if (!gate(feel, performance.now())) return;
  if (Capacitor.getPlatform() === 'android') { Native.play({ feel, strong: level === 'strong' }).catch(() => {}); return; }
  const p = WEB_PATTERN[feel];
  if (level === 'strong' && p) navigator.vibrate?.(p);
}
