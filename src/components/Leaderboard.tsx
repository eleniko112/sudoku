import React, { useState, useEffect } from 'react';
import { Trophy, Trash2, Filter } from 'lucide-react';
import { LeaderboardEntry, Difficulty } from '../types';
import { formatTime } from '../utils/sudoku';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onClearLeaderboard: () => void;
  currentDifficulty: Difficulty;
}

export default function Leaderboard({ entries, onClearLeaderboard, currentDifficulty }: LeaderboardProps) {
  const [filter, setFilter] = useState<Difficulty | 'all'>('all');

  // Translate difficulty names to Georgian
  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'easy':
        return 'მარტივი';
      case 'medium':
        return 'საშუალო';
      case 'hard':
        return 'რთული';
    }
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case 'easy':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-900';
      case 'medium':
        return 'bg-amber-950/40 text-amber-400 border-amber-900';
      case 'hard':
        return 'bg-rose-950/40 text-rose-400 border-rose-900';
    }
  };

  // Filter and sort entries (Fastest time first, then least mistakes, then date)
  const filteredEntries = entries
    .filter((entry) => filter === 'all' || entry.difficulty === filter)
    .sort((a, b) => {
      if (a.time !== b.time) {
        return a.time - b.time;
      }
      return a.mistakes - b.mistakes;
    })
    .slice(0, 10); // Display top 10

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight font-sans">
              ლიდერბორდი
            </h2>
            <p className="text-xs text-slate-500">
              საუკეთესო შედეგები
            </p>
          </div>
        </div>

        {entries.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ლიდერბორდის გასუფთავება?')) {
                onClearLeaderboard();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950/20 transition-all font-medium border border-transparent hover:border-red-900/40"
            title="გასუფთავება"
            id="clear-leaderboard-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            გასუფთავება
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5 p-1 bg-slate-950 rounded-xl">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          id="filter-all-btn"
        >
          ყველა
        </button>
        <button
          onClick={() => setFilter('easy')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            filter === 'easy'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          id="filter-easy-btn"
        >
          მარტივი
        </button>
        <button
          onClick={() => setFilter('medium')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            filter === 'medium'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          id="filter-medium-btn"
        >
          საშუალო
        </button>
        <button
          onClick={() => setFilter('hard')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            filter === 'hard'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          id="filter-hard-btn"
        >
          რთული
        </button>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-950 rounded-xl border border-dashed border-slate-800">
          <Trophy className="w-10 h-10 text-slate-600 mb-2 stroke-[1.5]" />
          <p className="text-sm text-slate-400 font-medium">
            ჩანაწერები არ მოიძებნა
          </p>
          <p className="text-xs text-slate-500 mt-1">
            ითამაშეთ სუდოკუ და გახდით პირველი!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 select-none">
                <th className="py-2.5 px-3">რეიტინგი</th>
                <th className="py-2.5 px-2">მოთამაშე</th>
                <th className="py-2.5 px-2 text-right">დრო</th>
                <th className="py-2.5 px-2 text-center">დონე</th>
                <th className="py-2.5 px-3 text-right">შეცდომები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredEntries.map((entry, index) => {
                const isTopThree = index < 3;
                return (
                  <tr
                    key={entry.id}
                    className="group hover:bg-slate-800/20 transition-all text-xs text-slate-300"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-500 flex items-center gap-1.5">
                      {index === 0 && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-955/50 border border-amber-900/50 text-amber-400 text-[11px]">
                          🥇
                        </span>
                      )}
                      {index === 1 && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-850/50 border border-slate-800/50 text-slate-400 text-[11px]">
                          🥈
                        </span>
                      )}
                      {index === 2 && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-800/20 text-amber-400 text-[11px]">
                          🥉
                        </span>
                      )}
                      {index > 2 && (
                        <span className="pl-1.5 text-slate-500">
                          #{index + 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-100 max-w-[120px] truncate" title={entry.name}>
                      {entry.name}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-250">
                      {formatTime(entry.time)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDifficultyColor(entry.difficulty)}`}>
                        {getDifficultyLabel(entry.difficulty)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-400">
                      {entry.mistakes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
