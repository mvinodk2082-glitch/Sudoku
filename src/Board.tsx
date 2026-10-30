import { boxOf, colOf, rowOf } from './engine/core';
import type { Game, PlayState, Settings } from './game/store';

interface Props { s: PlayState; settings: Settings; onSelect: (i: number) => void }

export function Board({ s, settings, onSelect }: Props) {
  const g = s.game as Game;
  const sel = s.selected;
  const selVal = sel >= 0 ? g.values[sel] : 0;
  const glow = new Set(s.glow.cells);
  const hint = new Set(s.hintCells);
  return (
    <div role="grid" aria-label="Sudoku board" aria-rowcount={9} aria-colcount={9}
      className={`grid aspect-square w-full grid-cols-9 overflow-hidden rounded-xl border-2 border-thick bg-surface transition-[filter] duration-300 ${s.paused ? 'pointer-events-none blur-md' : ''}`}>
      {g.values.map((v, i) => {
        const r = rowOf(i), c = colOf(i);
        const given = !!g.puzzle[i];
        const wrong = !!v && v !== g.solution[i] && settings.mistakeCheck;
        const peer = sel >= 0 && i !== sel && (rowOf(sel) === r || colOf(sel) === c || boxOf(sel) === boxOf(i));
        const same = settings.highlightSame && !!selVal && v === selVal && i !== sel;
        let bg = '';
        if (i === sel) bg = 'bg-sel';
        else if (hint.has(i)) bg = 'bg-same';
        else if (same) bg = 'bg-same';
        else if (peer) bg = 'bg-peer';
        const borders = `${c < 8 ? (c % 3 === 2 ? 'border-r-2 border-r-thick' : 'border-r border-r-line') : ''} ${r < 8 ? (r % 3 === 2 ? 'border-b-2 border-b-thick' : 'border-b border-b-line') : ''}`;
        const notes = g.notes[i];
        const label = `Row ${r + 1}, column ${c + 1}, ${v ? `${v}${given ? ', given' : ''}${wrong ? ', incorrect' : ''}` : notes ? `notes ${[1,2,3,4,5,6,7,8,9].filter((d) => notes & (1 << (d - 1))).join(' ')}` : 'empty'}`;
        return (
          <button key={i} role="gridcell" aria-label={label} aria-selected={i === sel} tabIndex={i === sel ? 0 : -1}
            onClick={() => onSelect(i)}
            className={`relative flex aspect-square items-center justify-center ${borders} ${bg} transition-colors duration-150`}>
            {glow.has(i) && <span key={s.glow.key} className="pointer-events-none absolute inset-0 animate-glow" />}
            {v ? (
              <span key={i === s.pop.cell ? s.pop.key : 0}
                className={`relative text-[clamp(20px,7.4vw,34px)] leading-none ${given ? 'font-medium text-given' : wrong ? 'font-normal text-rose' : 'font-normal text-accent'} ${i === s.pop.cell && !given ? 'animate-pop' : ''} ${wrong && i === s.pop.cell ? 'animate-shake' : ''}`}>
                {v}
              </span>
            ) : notes ? (
              <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-[2px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <span key={d} className={`flex items-center justify-center text-[clamp(8px,2.5vw,12px)] leading-none ${selVal === d && notes & (1 << (d - 1)) ? 'font-semibold text-accent' : 'text-note'}`}>
                    {notes & (1 << (d - 1)) ? d : ''}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
