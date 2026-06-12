import React, { useEffect, useRef } from 'react';
import { Cell } from '../types';
import { Sparkles, Trash2, Edit2 } from 'lucide-react';

interface SudokuGridProps {
  grid: Cell[][];
  selectedCell: { row: number; col: number } | null;
  onSelectCell: (row: number, col: number) => void;
  onCellValueChange: (row: number, col: number, value: number) => void;
  onToggleNote: (row: number, col: number, value: number) => void;
  isNoteMode: boolean;
  onToggleNoteMode: () => void;
  solution: number[][];
  isSolved: boolean;
}

export default function SudokuGrid({
  grid,
  selectedCell,
  onSelectCell,
  onCellValueChange,
  onToggleNote,
  isNoteMode,
  onToggleNoteMode,
  solution,
  isSolved,
}: SudokuGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation handles Arrow keys, backspace, and numbers 1-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || isSolved) return;
      const { row, col } = selectedCell;

      if (e.key === 'ArrowUp' && row > 0) {
        e.preventDefault();
        onSelectCell(row - 1, col);
      } else if (e.key === 'ArrowDown' && row < 8) {
        e.preventDefault();
        onSelectCell(row + 1, col);
      } else if (e.key === 'ArrowLeft' && col > 0) {
        e.preventDefault();
        onSelectCell(row, col - 1);
      } else if (e.key === 'ArrowRight' && col < 8) {
        e.preventDefault();
        onSelectCell(row, col + 1);
      } else if (e.key >= '1' && e.key <= '9') {
        const value = parseInt(e.key);
        if (isNoteMode) {
          onToggleNote(row, col, value);
        } else {
          onCellValueChange(row, col, value);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        onCellValueChange(row, col, 0);
      } else if (e.key.toLowerCase() === 'n') {
        onToggleNoteMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCell, isNoteMode, onSelectCell, onCellValueChange, onToggleNote, onToggleNoteMode, isSolved]);

  // Determine if a cell is in the same row, col, or 3x3 block as the selected cell
  const getCellHighlightClass = (r: number, c: number, cellValue: number) => {
    if (!selectedCell) return '';

    const { row: selRow, col: selCol } = selectedCell;
    const isSelected = selRow === r && selCol === c;
    const sameRow = selRow === r;
    const sameCol = selCol === c;
    const sameBox = Math.floor(selRow / 3) === Math.floor(r / 3) && Math.floor(selCol / 3) === Math.floor(c / 3);

    const hasSelectedValue = selRow !== undefined && selCol !== undefined && grid[selRow] !== undefined;
    const selectedCellValue = hasSelectedValue ? grid[selRow][selCol]?.value : 0;
    const isSameValue = selectedCellValue > 0 && cellValue === selectedCellValue && !isSelected;

    if (isSelected) {
      return 'bg-indigo-900/40 ring-2 ring-indigo-500 scale-[1.02] z-10 shadow-lg shadow-indigo-600/15'; // Matches the Elegant Dark design: bg-indigo-900/30 ring-2 ring-indigo-500
    }

    if (isSameValue) {
      return 'bg-slate-800 text-indigo-300 ring-1 ring-slate-700 font-bold z-1';
    }

    if (sameRow || sameCol || sameBox) {
      return 'bg-slate-800/35';
    }

    return '';
  };

  const activeValue = (selectedCell && grid[selectedCell.row]) ? grid[selectedCell.row][selectedCell.col]?.value : null;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Sudoku Board Wrapper to maintain aspect ratio with Elegant Dark border */}
      <div 
        ref={gridRef}
        className="w-full aspect-square bg-slate-800 p-[3px] rounded-2xl shadow-2xl border-4 border-slate-700 relative z-0 touch-none select-none max-w-[420px]"
        id="sudoku-board"
      >
        <div className="grid grid-cols-9 h-full w-full gap-[1px] bg-slate-700">
          {grid.map((row_cells, r) =>
            row_cells.map((cell, c) => {
              const borderClasses = `
                ${c % 3 === 2 && c < 8 ? 'border-r-2 border-slate-600' : ''}
                ${r % 3 === 2 && r < 8 ? 'border-b-2 border-slate-600' : ''}
              `;

              const highlightClass = getCellHighlightClass(r, c, cell.value);

              // Background coloring
              let cellBg = 'bg-slate-900';
              let textStyle = '';

              if (cell.initial) {
                // Pre-filled uneditable cells (Elegant Dark: text-indigo-400)
                textStyle = 'text-indigo-400 font-black text-[1.3rem]';
                cellBg = 'bg-slate-900/40';
              } else if (cell.value > 0) {
                // Editable user-filled cells (Elegant Dark: text-white)
                textStyle = 'text-white font-semibold text-[1.3rem]';
              }

              if (cell.error) {
                cellBg = 'bg-red-950/30 border border-red-500/40';
                textStyle = 'text-red-400 font-bold text-[1.3rem] animate-pulse';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => onSelectCell(r, c)}
                  className={`
                    relative flex items-center justify-center h-full w-full 
                    transition-all duration-100 focus:outline-none select-none
                    ${cellBg} ${highlightClass} ${borderClasses}
                  `}
                  id={`cell-${r}-${c}`}
                  style={{ touchAction: 'none' }}
                >
                  {cell.value > 0 ? (
                    <span className={textStyle}>
                      {cell.value}
                    </span>
                  ) : (
                    /* Render Pencil Notes if they exist */
                    <div className="grid grid-cols-3 grid-rows-3 h-full w-full p-1 text-[8.5px] font-mono leading-none text-slate-500">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <span
                          key={num}
                          className={`flex items-center justify-center ${
                            cell.notes.includes(num) ? 'opacity-100 scale-100 font-extrabold text-indigo-400' : 'opacity-0 scale-75'
                          }`}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {isSolved && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
            <div className="w-16 h-16 bg-indigo-500/15 text-indigo-400 flex items-center justify-center rounded-2xl mb-4 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-indigo-400 tracking-tight font-sans">
              შენ მოიგე! 🎉
            </h3>
            <p className="text-sm text-slate-400 max-w-xs mt-2">
              მშვენიერია! თავსატეხი წარმატებით და სრულად შეივსო!
            </p>
          </div>
        )}
      </div>

      {/* Controller Buttons Below Grid */}
      <div className="flex items-center justify-between gap-3 w-full mt-4 select-none">
        <button
          onClick={onToggleNoteMode}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
            isNoteMode
              ? 'bg-indigo-600 border-indigo-500/30 text-white shadow-lg shadow-indigo-600/15'
              : 'bg-slate-900 border-slate-800 text-slate-355 hover:bg-slate-800'
          }`}
          title="pencil mode"
          id="pencil-mode-btn"
        >
          <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
          {isNoteMode ? 'მონიშვნა: ჩართ.' : 'მონიშვნა: გამორთ.'}
        </button>

        <button
          onClick={() => {
            if (selectedCell && !isSolved) {
              onCellValueChange(selectedCell.row, selectedCell.col, 0);
            }
          }}
          disabled={!selectedCell || isSolved || (selectedCell && grid[selectedCell.row]?.[selectedCell.col]?.initial)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
          title="წაშლა"
          id="erase-cell-btn"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-450" />
          წაშლა
        </button>
      </div>

      {/* On-Screen Touch Numpad */}
      <div className="w-full mt-5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 select-none shadow-xl">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            // Count remaining occurrences of each digit
            let count = 0;
            grid.forEach(row => row.forEach(cell => {
              if (cell.value === num) count++;
            }));
            const isFinished = count === 9;

            return (
              <button
                key={num}
                onClick={() => {
                  if (!selectedCell || isSolved) return;
                  if (isNoteMode) {
                    onToggleNote(selectedCell.row, selectedCell.col, num);
                  } else {
                    onCellValueChange(selectedCell.row, selectedCell.col, num);
                  }
                }}
                disabled={isSolved || !selectedCell}
                className={`
                  relative flex flex-col items-center justify-center py-2 h-12 rounded-lg font-bold transition-all text-sm border
                  ${
                    isFinished
                      ? 'bg-slate-950 border-slate-900 text-slate-600 pointer-events-none'
                      : 'bg-slate-800 hover:bg-indigo-600 border-slate-700/60 text-white hover:scale-[1.04] active:scale-95 shadow-md active:bg-indigo-700'
                  }
                  disabled:opacity-50 disabled:pointer-events-none
                `}
                id={`numpad-${num}`}
              >
                <span>{num}</span>
                <span className="text-[8px] font-medium text-slate-400 mt-0.5">
                  {count}/9
                </span>
              </button>
            );
          })}

          {/* Quick Eraser / Clear on Keypad */}
          <button
            onClick={() => {
              if (selectedCell && !isSolved) {
                onCellValueChange(selectedCell.row, selectedCell.col, 0);
              }
            }}
            disabled={isSolved || !selectedCell || (selectedCell && grid[selectedCell.row]?.[selectedCell.col]?.initial)}
            className="flex flex-col items-center justify-center h-12 rounded-lg text-xs font-bold transition-all border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:scale-[1.04] active:scale-95 disabled:opacity-40 disabled:pointer-events-none col-span-1"
            id="numpad-clear"
          >
            <Trash2 className="w-4 h-4 text-rose-450" />
            <span className="text-[7px] text-slate-400 mt-0.5">გასუფთავება</span>
          </button>
        </div>
      </div>
    </div>
  );
}
