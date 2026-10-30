// Builds src/engine/bank.json of Expert/Master puzzles using the app's own generator + grader.
import { writeFileSync } from 'node:fs';
import { carve, generateSolved, grade } from '../src/engine/generator';
import { stringify } from '../src/engine/core';
import { hasUniqueSolution } from '../src/engine/solver';
import { mulberry32 } from '../src/engine/rng';

const rng = mulberry32(20261030);
const bank: Record<string, string[][]> = { Easy: [], Medium: [], Hard: [], Expert: [], Master: [] };
const want = 200;
let n = 0;
const t0 = Date.now();
while ((bank.Expert.length < want || bank.Master.length < want) && Date.now() - t0 < 600_000) {
  const sol = generateSolved(rng);
  const p = carve(sol, rng);
  const g = grade(p);
  n++;
  if ((g === 'Expert' || g === 'Master') && bank[g].length < want && hasUniqueSolution(p)) bank[g].push([stringify(p), stringify(sol)]);
}
console.log(`tried ${n}, expert ${bank.Expert.length}, master ${bank.Master.length}, ${(Date.now() - t0) / 1000}s`);
writeFileSync('src/engine/bank.json', JSON.stringify(bank));
