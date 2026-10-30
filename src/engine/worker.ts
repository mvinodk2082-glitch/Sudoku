import { canonicalKey } from './canonical';
import type { Difficulty } from './constants';
import { dailyPuzzle, generate } from './generator';

export type WorkerReq = { id: number; difficulty?: Difficulty; daily?: string; seen?: string[] };
self.onmessage = (e: MessageEvent<WorkerReq>) => {
  const { id, difficulty, daily, seen } = e.data;
  const p = daily ? dailyPuzzle(daily) : generate(difficulty ?? 'Easy', Math.random, 2500, new Set(seen));
  (self as unknown as Worker).postMessage({ id, ...p, key: canonicalKey(p.puzzle) });
};
