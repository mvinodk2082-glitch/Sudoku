// Board helpers. A grid is number[81]; 0 = empty. Candidate masks use bit (d-1) for digit d.
export const ALL = 0x1ff;
export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

export const ROWS: number[][] = [];
export const COLS: number[][] = [];
export const BOXES: number[][] = [];
for (let k = 0; k < 9; k++) {
  ROWS.push([]); COLS.push([]); BOXES.push([]);
}
for (let i = 0; i < 81; i++) {
  ROWS[rowOf(i)].push(i);
  COLS[colOf(i)].push(i);
  BOXES[boxOf(i)].push(i);
}
export type UnitKind = 'row' | 'column' | 'box';
export interface Unit { kind: UnitKind; index: number; cells: number[] }
export const UNITS: Unit[] = [
  ...ROWS.map((cells, index) => ({ kind: 'row' as const, index, cells })),
  ...COLS.map((cells, index) => ({ kind: 'column' as const, index, cells })),
  ...BOXES.map((cells, index) => ({ kind: 'box' as const, index, cells })),
];
export const unitName = (u: Unit) => `${u.kind} ${u.index + 1}`;

export const PEERS: number[][] = [];
for (let i = 0; i < 81; i++) {
  const s = new Set<number>([...ROWS[rowOf(i)], ...COLS[colOf(i)], ...BOXES[boxOf(i)]]);
  s.delete(i);
  PEERS.push([...s]);
}
export const isPeer = (a: number, b: number) =>
  a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));

export function popcount(m: number): number {
  let c = 0;
  while (m) { m &= m - 1; c++; }
  return c;
}
export function digitsOf(m: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) out.push(d);
  return out;
}
export const bit = (d: number) => 1 << (d - 1);
export const cellName = (i: number) => `R${rowOf(i) + 1}C${colOf(i) + 1}`;

export function parse(s: string): number[] {
  return s.replace(/\s/g, '').split('').map((ch) => (ch >= '1' && ch <= '9' ? +ch : 0));
}
export const stringify = (g: number[]) => g.map((v) => (v ? String(v) : '.')).join('');
