import { Difficulty, dailyPuzzle, generate } from './generator';

export type WorkerReq = { id: number; difficulty?: Difficulty; daily?: string };
self.onmessage = (e: MessageEvent<WorkerReq>) => {
  const { id, difficulty, daily } = e.data;
  const p = daily ? dailyPuzzle(daily) : generate(difficulty ?? 'Easy');
  (self as unknown as Worker).postMessage({ id, ...p });
};
