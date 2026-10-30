import type { Puzzle } from '../engine/generator';
import type { Difficulty } from '../engine/constants';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (p: Puzzle) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Puzzle & { id: number }>) => {
      const cb = pending.get(e.data.id);
      pending.delete(e.data.id);
      cb?.(e.data);
    };
    return worker;
  } catch {
    return null;
  }
}

/** Generate off the main thread; falls back to in-thread generation if workers are unavailable. */
export async function requestPuzzle(opts: { difficulty?: Difficulty; daily?: string }): Promise<Puzzle> {
  const w = getWorker();
  if (!w) {
    const g = await import('../engine/generator');
    return opts.daily ? g.dailyPuzzle(opts.daily) : g.generate(opts.difficulty ?? 'Easy');
  }
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, ...opts });
  });
}
