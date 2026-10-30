import type { Puzzle } from '../engine/generator';
import type { Difficulty } from '../engine/constants';
import { loadSeen } from './challenge';

export type Served = Puzzle & { key: string };
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (p: Served) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Served & { id: number }>) => {
      const cb = pending.get(e.data.id);
      pending.delete(e.data.id);
      cb?.(e.data);
    };
    return worker;
  } catch {
    return null;
  }
}

/** Generate off the main thread, never repeating a puzzle (up to isomorphism) already served at that level. */
export async function requestPuzzle(opts: { difficulty?: Difficulty; daily?: string }): Promise<Served> {
  const seen = opts.difficulty ? loadSeen(opts.difficulty) : [];
  const w = getWorker();
  if (!w) {
    const g = await import('../engine/generator');
    const { canonicalKey } = await import('../engine/canonical');
    const p = opts.daily ? g.dailyPuzzle(opts.daily) : g.generate(opts.difficulty ?? 'Easy', Math.random, 2500, new Set(seen));
    return { ...p, key: canonicalKey(p.puzzle) };
  }
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, ...opts, seen });
  });
}
