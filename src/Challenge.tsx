import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { type ChallengeRecord, challengeLink, encodeChallenge } from './game/challenge';
import { fmtTime, type Game } from './game/store';
import { Icon, Sheet } from './ui';

export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Capacitor.isNativePlatform()) { await Share.share({ title, text, dialogTitle: title }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text }); return 'shared'; }
  } catch (e) {
    if ((e as Error)?.message?.toLowerCase().includes('cancel')) return 'failed';
  }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}

const t = (ms: number | null) => (ms === null ? '—' : fmtTime(ms));

/** Side-by-side comparison of two results. Lower time wins; unfinished loses. */
export function Compare({ me, them, myName = 'You', theirName }: {
  me: { time: number | null; mistakes: number | null }; them: { time: number | null; mistakes: number | null }; myName?: string; theirName: string;
}) {
  let verdict = 'Waiting for their result';
  if (me.time !== null && them.time !== null) verdict = me.time < them.time ? 'You win 🎉' : me.time > them.time ? `${theirName} wins` : 'Dead heat';
  else if (me.time !== null && them.time === null && them.mistakes !== null) verdict = 'You win 🎉';
  const col = (name: string, r: typeof me, best: boolean) => (
    <div className={`flex-1 rounded-2xl p-3 text-center ${best ? 'bg-accent/15 ring-1 ring-accent/50' : 'bg-raised'}`}>
      <div className="truncate text-xs text-muted">{name}</div>
      <div className="mt-1 text-2xl tabular-nums">{t(r.time)}</div>
      <div className="text-[11px] text-muted">{r.mistakes === null ? 'not finished' : `${r.mistakes} mistake${r.mistakes === 1 ? '' : 's'}`}</div>
    </div>
  );
  const meBest = me.time !== null && (them.time === null || me.time <= them.time);
  const themBest = them.time !== null && (me.time === null || them.time <= me.time);
  return (
    <div>
      <div className="mb-3 text-center text-sm font-medium">{verdict}</div>
      <div className="flex gap-2">{col(myName, me, meBest)}<div className="self-center text-xs text-muted">vs</div>{col(theirName || 'Friend', them, themBest)}</div>
    </div>
  );
}

export function InviteSheet({ game, name, onName, onClose, challengeId }: {
  game: Game; name: string; onName: (n: string) => void; onClose: () => void; challengeId: string;
}) {
  const [status, setStatus] = useState('');
  const finished = game.status === 'won';
  const code = encodeChallenge({
    kind: 'invite', id: challengeId, difficulty: game.difficulty, puzzle: game.puzzle,
    hostName: name, hostTime: finished ? game.elapsed : null, hostMistakes: finished ? game.mistakes : null,
    guestName: '', guestTime: null, guestMistakes: null,
  });
  const link = challengeLink(code);
  const who = name.trim() || 'A friend';
  const msg = `${who} challenged you to a ${game.difficulty} Sudoku${finished ? ` and solved it in ${fmtTime(game.elapsed)}` : ''}. Can you beat it?\n\nOpen in the Sudoku app: ${link}\n\nOr open Sudoku → Join with code and paste:\n${code}`;
  return (
    <Sheet title="Challenge a friend" onClose={onClose}>
      <p className="text-sm text-muted">Your friend gets this exact puzzle. When they finish, they can send their result back to compare.</p>
      <label className="mt-4 block text-xs uppercase tracking-widest text-muted" htmlFor="pname">Your name (optional)</label>
      <input id="pname" value={name} maxLength={24} onChange={(e) => onName(e.target.value)} placeholder="Shown to your friend"
        className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-[15px] outline-none focus:border-accent" />
      <div className="mt-4 rounded-2xl border border-line bg-bg p-3">
        <div className="text-xs text-muted">{game.difficulty} · {finished ? `your time ${fmtTime(game.elapsed)}` : 'in progress'}</div>
        <div className="mt-2 break-all font-mono text-[11px] leading-snug text-accent" aria-label="Challenge code">{code}</div>
      </div>
      <button onClick={async () => { const r = await shareText('Sudoku challenge', msg); setStatus(r === 'copied' ? 'Invite copied to clipboard' : r === 'shared' ? 'Invite shared' : ''); }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-medium text-bg">
        <Icon name="share" /> Send invite
      </button>
      <button onClick={async () => { try { await navigator.clipboard.writeText(code); setStatus('Code copied'); } catch { setStatus('Copy failed'); } }}
        className="mt-2 w-full rounded-full bg-raised py-3 text-sm">Copy code only</button>
      <p className="mt-3 min-h-[1.25rem] text-center text-xs text-accent" aria-live="polite">{status}</p>
      <p className="text-center text-[11px] text-muted">Only the puzzle, difficulty, your name and time are in the link.</p>
    </Sheet>
  );
}

export function ChallengesSheet({ list, onClose }: { list: ChallengeRecord[]; onClose: () => void }) {
  return (
    <Sheet title="Challenges" onClose={onClose}>
      {!list.length && <p className="py-6 text-center text-sm text-muted">No challenges yet. Start a game and tap the share icon to invite a friend.</p>}
      <div className="flex flex-col gap-3">
        {list.map((r) => (
          <div key={`${r.id}${r.role}`} className="rounded-2xl border border-line p-3">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>{r.role === 'host' ? `You challenged ${r.opponent || 'a friend'}` : `From ${r.opponent || 'a friend'}`} · {r.difficulty}</span>
              <span>{new Date(r.date).toLocaleDateString()}</span>
            </div>
            <Compare me={{ time: r.myTime, mistakes: r.myMistakes }} them={{ time: r.theirTime, mistakes: r.theirMistakes }} theirName={r.opponent || 'Friend'} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}
