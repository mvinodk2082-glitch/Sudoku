import { describe, expect, it } from 'vitest';
import { THEMES, resolveTheme, youVariants } from '../../themes';

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('themes', () => {
  const all = [...THEMES.map((t) => [t.name, t.tokens] as const), ['You light', youVariants.light] as const];
  for (const [name, k] of all) {
    it(`${name} has readable contrast`, () => {
      for (const b of [k.bg, k.surface, k.peer, k.same, k.sel]) {
        expect(contrast(k.given, b)).toBeGreaterThanOrEqual(7);
        expect(contrast(k.accent, b)).toBeGreaterThanOrEqual(3);
        expect(contrast(k.rose, b)).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(k.note, k.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(k.text, k.bg)).toBeGreaterThanOrEqual(7);
    });
  }
  it('migrates 1.0 theme values', () => {
    expect(resolveTheme('dark').id).toBe('sage');
    expect(resolveTheme('light').id).toBe('paper');
    expect(resolveTheme('nope').id).toBe('sage');
  });
});
