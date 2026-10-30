export const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export function dailyKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
