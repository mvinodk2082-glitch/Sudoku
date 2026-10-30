import { Capacitor, registerPlugin } from '@capacitor/core';

/** Theme tokens (hex). Every theme is calm and low-saturation. */
export interface Tokens {
  bg: string; surface: string; raised: string; line: string; thick: string; text: string; muted: string;
  given: string; accent: string; rose: string; peer: string; same: string; sel: string; note: string;
}
export interface Theme { id: string; name: string; dark: boolean; tokens: Tokens }

const amoled = (accent: string, given: string, same: string, sel: string, peer: string, rose = '#C98C92'): Tokens => ({
  bg: '#000000', surface: '#0E0E0F', raised: '#1C1C1E', line: '#2C2C30', thick: '#78787E', text: '#DEDEE0', muted: '#8A8A90',
  given, accent, rose, peer, same, sel, note: '#9A9AA0',
});
const youDark: Tokens = {
  bg: '#111413', surface: '#1A1D1B', raised: '#242826', line: '#333835', thick: '#7C847F', text: '#E0E4E1', muted: '#929A95',
  given: '#E8ECE9', accent: '#8FA89A', rose: '#CC9096', peer: '#1F2321', same: '#2B3832', sel: '#35473D', note: '#A0A8A3',
};
const youLight: Tokens = {
  bg: '#F6F8F6', surface: '#FFFFFF', raised: '#E7ECE8', line: '#D3DAD5', thick: '#56605A', text: '#1E2420', muted: '#68736C',
  given: '#1B201D', accent: '#4F6F5E', rose: '#A8565F', peer: '#EAEFEB', same: '#D6E3DA', sel: '#C3D7CA', note: '#5F6A63',
};

export const THEMES: Theme[] = [
  { id: 'sage', name: 'AMOLED Sage', dark: true, tokens: amoled('#8FA89A', '#E8E8E8', '#2A3530', '#34423A', '#161818') },
  { id: 'slate', name: 'AMOLED Slate', dark: true, tokens: amoled('#8E9CB4', '#E6E8EC', '#272C36', '#323A48', '#15161A') },
  { id: 'sand', name: 'AMOLED Sand', dark: true, tokens: amoled('#B8A585', '#ECE8E0', '#33302A', '#3F3A30', '#181715', '#C48E86') },
  { id: 'lavender', name: 'AMOLED Lavender', dark: true, tokens: amoled('#A69CBC', '#EAE8EE', '#2E2B36', '#3A3546', '#17161A', '#C98C9C') },
  { id: 'midnight', name: 'Midnight', dark: true, tokens: {
    bg: '#0E121A', surface: '#141A24', raised: '#1D2430', line: '#2A3240', thick: '#6E7A8C', text: '#DCE0E8', muted: '#8790A0',
    given: '#E6EAF0', accent: '#8FA6B8', rose: '#C88E96', peer: '#18202C', same: '#263244', sel: '#2F3E54', note: '#9AA3B2' } },
  { id: 'graphite', name: 'Graphite', dark: true, tokens: {
    bg: '#1A1A1C', surface: '#222224', raised: '#2C2C2F', line: '#3A3A3E', thick: '#85858B', text: '#E0E0E2', muted: '#96969C',
    given: '#ECECEC', accent: '#9DB0A4', rose: '#CC9096', peer: '#28282B', same: '#33403A', sel: '#3D4C44', note: '#A0A0A6' } },
  { id: 'paper', name: 'Paper', dark: false, tokens: {
    bg: '#F4F1EA', surface: '#FBF9F4', raised: '#ECE7DC', line: '#D9D3C6', thick: '#5A554C', text: '#2A2722', muted: '#7A7468',
    given: '#24211C', accent: '#5E7C6A', rose: '#A9575F', peer: '#EDE7DA', same: '#DCE5DC', sel: '#CBDACF', note: '#6E685C' } },
  { id: 'mist', name: 'Mist', dark: false, tokens: {
    bg: '#EEF1F4', surface: '#F8FAFC', raised: '#E3E8ED', line: '#CDD4DC', thick: '#4E5866', text: '#23282F', muted: '#6C7682',
    given: '#1E232A', accent: '#5B7389', rose: '#A8586A', peer: '#E4E9EF', same: '#D7E0EA', sel: '#C5D3E1', note: '#667080' } },
  { id: 'you', name: 'Material You', dark: true, tokens: youDark },
];

const systemDark = () => typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches;

/** Resolve a theme id (migrating the 1.0 'dark'/'light' values); 'you' follows the system. */
export function resolveTheme(id: string): Theme {
  const mapped = id === 'dark' ? 'sage' : id === 'light' ? 'paper' : id;
  const t = THEMES.find((x) => x.id === mapped) ?? THEMES[0];
  if (t.id !== 'you') return t;
  const dark = systemDark();
  return { ...t, dark, tokens: dark ? youDark : youLight };
}
export const youVariants = { dark: youDark, light: youLight };

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const SystemBars = registerPlugin<{ setColors(o: { color: string; dark: boolean }): Promise<void> }>('SystemBars');

export function applyTheme(id: string) {
  const t = resolveTheme(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.tokens)) root.style.setProperty(`--${k}`, rgb(v));
  root.style.colorScheme = t.dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.tokens.bg);
  if (Capacitor.isNativePlatform()) SystemBars.setColors({ color: t.tokens.bg, dark: t.dark }).catch(() => {});
  return t;
}
