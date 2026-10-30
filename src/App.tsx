import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Board } from './Board';
import { DIFFICULTIES, Difficulty, dailyKey } from './engine/constants';
import { requestPuzzle } from './game/generate';
import {
  MAX_MISTAKES, Settings, Stats, dailyStreaks, emptyStats, fmtTime, initialPlay, loadGame, loadSettings, loadStats,
  recordResult, reducer, saveGame, saveSettings, saveStats,
} from './game/store';
import { Icon, Sheet, Toggle } from './ui';
import { THEMES, applyTheme, resolveTheme, youVariants, type Tokens } from './themes';

type View = 'home' | 'game';
type Modal = null | 'stats' | 'settings' | 'new';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [s, dispatch] = useReducer(reducer, initialPlay, (init) => {
    const g = loadGame();
    return g && g.status === 'playing' ? reducer(init, { type: 'load', game: g }) : init;
  });
  const [view, setView] = useState<View>('home');
  const [modal, setModal] = useState<Modal>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const g = s.game;
  const today = dailyKey();

  useEffect(() => {
    applyTheme(settings.theme);
    saveSettings(settings);
    if (resolveTheme(settings.theme).id !== 'you') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme(settings.theme);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [settings]);
  useEffect(() => saveStats(stats), [stats]);
  useEffect(() => saveGame(g), [g]);

  // Timer: ticks only while a game is visible, playing and not paused.
  useEffect(() => {
    if (view !== 'game' || !g || g.status !== 'playing' || s.paused) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') dispatch({ type: 'tick', ms: 1000 }); }, 1000);
    return () => clearInterval(t);
  }, [view, g?.status, s.paused, g]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden' && view === 'game') dispatch({ type: 'pause', paused: true }); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [view]);

  // Record results once.
  useEffect(() => {
    if (g && g.status !== 'playing') setStats((st) => recordResult(st, g, g.status === 'won'));
  }, [g?.status, g]);

  const buzz = useCallback((strong = false) => {
    if (!settings.haptics) return;
    Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => navigator.vibrate?.(strong ? 30 : 10));
  }, [settings.haptics]);

  const startGame = async (opts: { difficulty?: Difficulty; daily?: string }) => {
    if (g && g.status === 'playing' && g.values.some((v, i) => v !== g.puzzle[i]) && g.daily !== opts.daily) {
      setStats((st) => recordResult(st, g, false)); // abandoned game counts as played, breaks streak
    }
    setModal(null);
    setLoading(opts.daily ? 'Daily challenge' : opts.difficulty!);
    const puzzle = await requestPuzzle(opts);
    dispatch({ type: 'new', puzzle, daily: opts.daily ?? null });
    setLoading(null);
    setView('game');
  };

  const input = useCallback((d: number) => { dispatch({ type: 'input', digit: d, settings }); buzz(); }, [settings, buzz]);

  // Keyboard support.
  useEffect(() => {
    if (view !== 'game') return;
    const onKey = (e: KeyboardEvent) => {
      if (modal) return;
      const k = e.key;
      if (k >= '1' && k <= '9') input(+k);
      else if (k === 'Backspace' || k === 'Delete' || k === '0') dispatch({ type: 'erase' });
      else if (k === 'ArrowUp') dispatch({ type: 'move', dr: -1, dc: 0 });
      else if (k === 'ArrowDown') dispatch({ type: 'move', dr: 1, dc: 0 });
      else if (k === 'ArrowLeft') dispatch({ type: 'move', dr: 0, dc: -1 });
      else if (k === 'ArrowRight') dispatch({ type: 'move', dr: 0, dc: 1 });
      else if (k === 'n' || k === 'N') dispatch({ type: 'notes' });
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'y') dispatch({ type: 'redo' });
      else if (k === 'h') dispatch({ type: 'hint', settings });
      else if (k === ' ' || k === 'p') dispatch({ type: 'pause', paused: !s.paused });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, modal, input, settings, s.paused]);

  // Screen-reader announcements for the selected cell.
  useEffect(() => {
    if (!g || s.selected < 0) return;
    const v = g.values[s.selected];
    setAnnounce(`Row ${Math.floor(s.selected / 9) + 1}, column ${(s.selected % 9) + 1}: ${v || 'empty'}`);
  }, [s.selected, g]);
  useEffect(() => { if (s.message) setAnnounce(s.message.text); }, [s.message]);
  useEffect(() => { if (g?.status === 'won') buzz(true); }, [g?.status, buzz, g]);

  const remaining = useMemo(() => {
    const r = Array(10).fill(9);
    g?.values.forEach((v, i) => { if (v && v === g.solution[i]) r[v]--; });
    return r;
  }, [g]);

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[560px] flex-col">
      <div className="sr-only" aria-live="polite">{announce}</div>
      {view === 'home' || !g ? (
        <Home game={g} stats={stats} today={today} onContinue={() => { dispatch({ type: 'pause', paused: false }); setView('game'); }}
          onStart={startGame} onModal={setModal} loading={loading} />
      ) : (
        <>
          <header className="safe-t flex items-center justify-between px-3 pb-2">
            <button className="rounded-full p-2.5 text-muted hover:bg-raised" onClick={() => setView('home')} aria-label="Back to menu"><Icon name="back" /></button>
            <div className="text-center">
              <div className="text-sm font-medium">{g.daily ? `Daily · ${g.difficulty}` : g.difficulty}</div>
              <div className="text-xs text-muted">
                {settings.mistakeCheck ? `Mistakes ${g.mistakes}${settings.mistakeLimit ? `/${MAX_MISTAKES}` : ''}` : 'Mistake check off'}
                {g.hints ? ` · Hints ${g.hints}` : ''}
              </div>
            </div>
            <div className="flex items-center">
              {settings.showTimer && <span className="w-14 text-right text-sm tabular-nums text-muted" aria-label={`Time ${fmtTime(g.elapsed)}`}>{fmtTime(g.elapsed)}</span>}
              <button className="rounded-full p-2.5 text-muted hover:bg-raised" onClick={() => dispatch({ type: 'pause', paused: !s.paused })} aria-label={s.paused ? 'Resume' : 'Pause'}>
                <Icon name={s.paused ? 'play' : 'pause'} />
              </button>
            </div>
          </header>

          <main className="flex flex-1 flex-col justify-center px-2">
            <div className="relative mx-auto w-full" style={{ maxWidth: 'min(100%, calc(100dvh - 330px))', minWidth: 'min(100%, 280px)' }}>
              <Board s={s} settings={settings} onSelect={(i) => dispatch({ type: 'select', cell: i })} />
              {s.paused && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="text-sm text-muted">Paused · {fmtTime(g.elapsed)}</div>
                  <button onClick={() => dispatch({ type: 'pause', paused: false })} className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-bg">
                    <Icon name="play" /> Resume
                  </button>
                </div>
              )}
            </div>
            <div className="mx-auto mt-3 flex min-h-[44px] w-full items-start px-2" aria-live="polite">
              {s.message && (
                <button onClick={() => dispatch({ type: 'clearMessage' })}
                  className={`w-full animate-fadein rounded-xl border px-3 py-2 text-left text-[13px] leading-snug ${s.message.tone === 'error' ? 'border-rose/40 text-rose' : 'border-accent/40 text-text'}`}>
                  {s.message.tone === 'hint' && <span className="mr-1 font-semibold text-accent">Hint</span>}{s.message.text}
                </button>
              )}
            </div>
          </main>

          <footer className="safe-b px-2">
            <div className="mb-2 grid grid-cols-5 gap-1">
              <Tool icon="undo" label="Undo" onClick={() => dispatch({ type: 'undo' })} disabled={!s.past.length} />
              <Tool icon="erase" label="Erase" onClick={() => dispatch({ type: 'erase' })} />
              <Tool icon="pencil" label={s.notesMode ? 'Notes on' : 'Notes'} onClick={() => dispatch({ type: 'notes' })} active={s.notesMode} />
              <Tool icon="bulb" label="Hint" onClick={() => { dispatch({ type: 'hint', settings }); buzz(); }} />
              <Tool icon="redo" label="Redo" onClick={() => dispatch({ type: 'redo' })} disabled={!s.future.length} />
            </div>
            <div className="grid grid-cols-9 gap-1" role="group" aria-label="Number pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                const done = remaining[d] <= 0;
                return (
                  <button key={d} onClick={() => input(d)} disabled={done || s.paused}
                    aria-label={`${d}${done ? ', complete' : `, ${remaining[d]} left`}`}
                    className={`flex flex-col items-center rounded-xl py-2 transition active:scale-95 ${done ? 'opacity-25' : 'bg-surface hover:bg-raised'} ${s.notesMode ? 'text-muted' : 'text-text'}`}>
                    <span className={`leading-none ${s.notesMode ? 'text-[22px]' : 'text-[28px]'}`}>{d}</span>
                    <span className="mt-1 text-[10px] leading-none text-muted">{done ? '✓' : remaining[d]}</span>
                  </button>
                );
              })}
            </div>
          </footer>
        </>
      )}

      {g && g.status !== 'playing' && view === 'game' && (
        <EndScreen won={g.status === 'won'} game={g} stats={stats}
          onNew={() => startGame(g.daily ? { difficulty: g.difficulty } : { difficulty: g.difficulty })}
          onRetry={() => dispatch({ type: 'restart' })}
          onHome={() => { saveGame(null); setView('home'); }} />
      )}
      {modal === 'stats' && <StatsSheet stats={stats} today={today} onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <SettingsSheet settings={settings} onChange={setSettings} onClose={() => setModal(null)}
          onReset={() => { if (confirm('Reset all statistics?')) setStats(emptyStats()); }} />
      )}
      {loading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-pulse text-muted">Preparing {loading}…</div></div>}
    </div>
  );
}

function Tool({ icon, label, onClick, active, disabled }: { icon: string; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition active:scale-95 disabled:opacity-30 ${active ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-surface'}`}>
      <Icon name={icon} className="h-6 w-6" />{label}
    </button>
  );
}

function Home({ game, stats, today, onContinue, onStart, onModal, loading }: {
  game: ReturnType<typeof loadGame>; stats: Stats; today: string; onContinue: () => void;
  onStart: (o: { difficulty?: Difficulty; daily?: string }) => void; onModal: (m: Modal) => void; loading: string | null;
}) {
  const dailyDone = stats.daily[today] !== undefined;
  const streak = dailyStreaks(stats.daily, today);
  const canContinue = game && game.status === 'playing';
  return (
    <div className="safe-t safe-b flex flex-1 flex-col px-5">
      <div className="flex justify-end gap-1 pt-2">
        <button className="rounded-full p-2.5 text-muted hover:bg-raised" onClick={() => onModal('stats')} aria-label="Statistics"><Icon name="chart" /></button>
        <button className="rounded-full p-2.5 text-muted hover:bg-raised" onClick={() => onModal('settings')} aria-label="Settings"><Icon name="gear" /></button>
      </div>
      <div className="mt-6 flex flex-1 flex-col">
        <Logo />
        <h1 className="mt-5 text-4xl font-light tracking-tight">Sudoku</h1>
        <p className="mt-1 text-sm text-muted">Calm puzzles. No ads, no sign-in.</p>

        <button onClick={() => onStart({ daily: today })} disabled={!!loading}
          className="mt-8 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left hover:bg-raised">
          <span className="rounded-xl bg-accent/15 p-3 text-accent"><Icon name="calendar" className="h-6 w-6" /></span>
          <span className="flex-1">
            <span className="block font-medium">Daily Challenge</span>
            <span className="block text-xs text-muted">{dailyDone ? `Solved in ${fmtTime(stats.daily[today])} · ` : ''}Streak {streak.current} day{streak.current === 1 ? '' : 's'}</span>
          </span>
          {dailyDone && <span className="text-accent">✓</span>}
        </button>

        {canContinue && (
          <button onClick={onContinue} className="mt-3 rounded-2xl bg-accent p-4 text-left font-medium text-bg">
            Continue · {game!.daily ? 'Daily' : game!.difficulty} · {fmtTime(game!.elapsed)}
          </button>
        )}

        <div className="mt-6 text-xs uppercase tracking-widest text-muted">New game</div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {DIFFICULTIES.map((d, k) => (
            <button key={d} onClick={() => onStart({ difficulty: d })} disabled={!!loading}
              className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 hover:bg-raised">
              <span>{d}</span>
              <span className="flex gap-1" aria-hidden="true">{DIFFICULTIES.map((_, j) => <span key={j} className={`h-1.5 w-1.5 rounded-full ${j <= k ? 'bg-accent' : 'bg-line'}`} />)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
      <rect width="48" height="48" rx="14" className="fill-surface" />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={9 + c * 10.5} y={9 + r * 10.5} width="9" height="9" rx="2.2"
          className={r === 1 && c === 2 ? 'fill-accent' : 'fill-given'} opacity={r === 1 && c === 2 ? 1 : 0.9} />
      )))}
    </svg>
  );
}

function EndScreen({ won, game, stats, onNew, onRetry, onHome }: {
  won: boolean; game: NonNullable<ReturnType<typeof loadGame>>; stats: Stats; onNew: () => void; onRetry: () => void; onHome: () => void;
}) {
  const d = stats.byDiff[game.difficulty];
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-6" role="dialog" aria-modal="true" aria-label={won ? 'Puzzle solved' : 'Game over'}>
      <div className="w-full max-w-sm animate-fadein rounded-3xl border border-line bg-surface p-6 text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${won ? 'bg-accent/15 text-accent' : 'bg-rose/15 text-rose'} text-2xl`}>{won ? '✓' : '×'}</div>
        <h2 className="text-2xl font-light">{won ? 'Solved' : 'Three mistakes'}</h2>
        <p className="mt-1 text-sm text-muted">{won ? `${game.daily ? 'Daily · ' : ''}${game.difficulty} in ${fmtTime(game.elapsed)}` : 'Take a breath and try again.'}</p>
        {won && (
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <Stat k="Best" v={d.best !== null ? fmtTime(d.best) : '—'} />
            <Stat k="Streak" v={String(d.streak)} />
            <Stat k="Mistakes" v={String(game.mistakes)} />
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {!won && <button onClick={onRetry} className="rounded-full bg-accent py-3 font-medium text-bg">Restart this puzzle</button>}
          <button onClick={onNew} className={`rounded-full py-3 font-medium ${won ? 'bg-accent text-bg' : 'bg-raised'}`}>New {game.difficulty} game</button>
          <button onClick={onHome} className="rounded-full py-3 text-muted">Menu</button>
        </div>
      </div>
    </div>
  );
}

const Stat = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded-2xl bg-raised px-2 py-3"><div className="text-lg tabular-nums">{v}</div><div className="text-[11px] text-muted">{k}</div></div>
);

function StatsSheet({ stats, today, onClose }: { stats: Stats; today: string; onClose: () => void }) {
  const [tab, setTab] = useState<Difficulty>('Easy');
  const d = stats.byDiff[tab];
  const [y, m] = today.split('-').map(Number);
  const [month, setMonth] = useState({ y, m });
  const first = new Date(month.y, month.m - 1, 1);
  const days = new Date(month.y, month.m, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const streak = dailyStreaks(stats.daily, today);
  const shift = (n: number) => setMonth(({ y, m }) => { const t = new Date(y, m - 1 + n, 1); return { y: t.getFullYear(), m: t.getMonth() + 1 }; });
  return (
    <Sheet title="Statistics" onClose={onClose}>
      <div className="flex gap-1 overflow-x-auto rounded-full bg-raised p-1" role="tablist">
        {DIFFICULTIES.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs ${tab === x ? 'bg-accent text-bg' : 'text-muted'}`}>{x}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat k="Played" v={String(d.played)} />
        <Stat k="Win rate" v={d.played ? `${Math.round((d.won / d.played) * 100)}%` : '—'} />
        <Stat k="Won" v={String(d.won)} />
        <Stat k="Best time" v={d.best !== null ? fmtTime(d.best) : '—'} />
        <Stat k="Average" v={d.won ? fmtTime(d.totalTime / d.won) : '—'} />
        <Stat k="Streak / best" v={`${d.streak} / ${d.bestStreak}`} />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-medium">Daily challenges</h3>
        <span className="text-xs text-muted">Streak {streak.current} · Best {streak.best}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button onClick={() => shift(-1)} className="rounded-full p-2 text-muted hover:bg-raised" aria-label="Previous month"><Icon name="back" /></button>
        <span>{first.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => shift(1)} className="rotate-180 rounded-full p-2 text-muted hover:bg-raised" aria-label="Next month"><Icon name="back" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div key={i} className="py-1 text-muted">{x}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month.y}-${String(month.m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const done = stats.daily[key] !== undefined;
          return (
            <div key={key} aria-label={`${key}${done ? ' solved' : ''}`}
              className={`flex aspect-square items-center justify-center rounded-full ${done ? 'bg-accent text-bg' : key === today ? 'border border-accent text-accent' : 'text-muted'}`}>{i + 1}</div>
          );
        })}
      </div>
    </Sheet>
  );
}

function SettingsSheet({ settings, onChange, onClose, onReset }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void; onReset: () => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <Sheet title="Settings" onClose={onClose}>
      <h3 className="mb-2 text-xs uppercase tracking-widest text-muted">Theme</h3>
      <div className="mb-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => {
          const active = resolveTheme(settings.theme).id === t.id;
          return (
            <button key={t.id} role="radio" aria-checked={active} aria-label={`${t.name} theme`} onClick={() => set('theme', t.id)}
              className={`rounded-2xl border-2 p-1.5 text-left ${active ? 'border-accent' : 'border-transparent'}`}>
              {t.id === 'you'
                ? <div className="flex overflow-hidden rounded-xl"><div className="w-1/2 overflow-hidden"><Swatch k={youVariants.light} /></div><div className="w-1/2 overflow-hidden [direction:rtl]"><Swatch k={youVariants.dark} /></div></div>
                : <Swatch k={t.tokens} />}
              <div className="mt-1 truncate px-0.5 text-[11px]">{t.name}</div>
            </button>
          );
        })}
      </div>
      <div className="divide-y divide-line">
        <Toggle label="Mistake checking" desc="Show wrong digits in rose" checked={settings.mistakeCheck} onChange={(v) => set('mistakeCheck', v)} />
        <Toggle label="3-mistake limit" desc="Game ends after three mistakes" checked={settings.mistakeLimit} disabled={!settings.mistakeCheck} onChange={(v) => set('mistakeLimit', v)} />
        <Toggle label="Highlight same digits" checked={settings.highlightSame} onChange={(v) => set('highlightSame', v)} />
        <Toggle label="Auto-remove notes" desc="Clear a digit from notes in its row, column and box" checked={settings.autoNotes} onChange={(v) => set('autoNotes', v)} />
        <Toggle label="Show timer" checked={settings.showTimer} onChange={(v) => set('showTimer', v)} />
        <Toggle label="Haptic feedback" checked={settings.haptics} onChange={(v) => set('haptics', v)} />
      </div>
      <button onClick={onReset} className="mt-4 w-full rounded-full border border-rose/40 py-3 text-sm text-rose">Reset statistics</button>
      <p className="mt-4 text-center text-xs text-muted">Keyboard: 1–9, arrows, Backspace, N notes, H hint, Space pause, Ctrl+Z / Ctrl+Y</p>
    </Sheet>
  );
}

/** Live mini-board preview drawn with the theme's own colours. */
function Swatch({ k }: { k: Tokens }) {
  const cells: [string, string, string][] = [
    ['5', k.given, k.peer], ['', '', k.peer], ['3', k.accent, k.same],
    ['', '', k.surface], ['3', k.accent, k.sel], ['', '', k.peer],
    ['9', k.rose, k.surface], ['n', k.note, k.surface], ['3', k.given, k.same],
  ];
  return (
    <div className="grid aspect-square w-full min-w-[84px] grid-cols-3 overflow-hidden rounded-xl" style={{ background: k.bg, border: `2px solid ${k.thick}` }} aria-hidden="true">
      {cells.map(([d, c, b], i) => (
        <div key={i} className="flex items-center justify-center text-[15px] font-medium leading-none"
          style={{ background: b, color: c, borderRight: i % 3 < 2 ? `1px solid ${k.line}` : undefined, borderBottom: i < 6 ? `1px solid ${k.line}` : undefined }}>
          {d === 'n' ? <span className="text-[8px] leading-[9px]">1 4<br />7</span> : d}
        </div>
      ))}
    </div>
  );
}
