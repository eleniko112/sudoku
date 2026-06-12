import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw,
  RotateCw, 
  Volume2, 
  VolumeX, 
  Lightbulb, 
  Calendar, 
  HelpCircle, 
  Info,
  CheckCircle2, 
  Moon, 
  Sun, 
  Trophy, 
  Compass, 
  Sparkles,
  Gamepad2,
  ChevronRight,
  Shield,
  X,
  Download,
  Share2,
  Database
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell as RechartsCell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { Difficulty, Cell, LeaderboardEntry } from './types';
import { generatePuzzle, formatTime } from './utils/sudoku';
import { sound } from './utils/audio';
import SudokuGrid from './components/SudokuGrid';
import Leaderboard from './components/Leaderboard';

export default function App() {
  // Game states
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timer, setTimer] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [maxHints] = useState<number>(3);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isNoteMode, setIsNoteMode] = useState<boolean>(false);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  // Extras
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDailyMode, setIsDailyMode] = useState<boolean>(false);
  const [showWinModal, setShowWinModal] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const prevGridStringRef = useRef<string>('');

  // Lists
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Navigation / Views on mobile
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');

  // Trigger brief floating notifications
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev && prev.text === text ? null : prev);
    }, 4500);
  };

  // Initialize preferences, leaderboard, and resume saved game, if any
  useEffect(() => {
    // Media themes
    const savedTheme = localStorage.getItem('sudoku_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Audio status
    const savedMute = localStorage.getItem('sudoku_muted');
    if (savedMute === 'true') {
      sound.toggleMute();
      setIsMuted(true);
    }

    // Player name
    const savedPlayerName = localStorage.getItem('sudoku_player_name');
    if (savedPlayerName) {
      setPlayerName(savedPlayerName);
    }

    // Leaderboards
    const savedLeaderboard = localStorage.getItem('sudoku_leaderboard');
    if (savedLeaderboard) {
      try {
        setLeaderboard(JSON.parse(savedLeaderboard));
      } catch (err) {
        console.error('Failed to parse leaderboard', err);
      }
    }

    // Resume game state
    const savedGame = localStorage.getItem('sudoku_saved_game');
    if (savedGame) {
      try {
        const state = JSON.parse(savedGame);
        setGrid(state.grid);
        setSolution(state.solution);
        setDifficulty(state.difficulty);
        setTimer(state.timer);
        setMistakes(state.mistakes);
        setHintsUsed(state.hintsUsed);
        setIsTimerActive(state.isTimerActive);
        setIsSolved(state.isSolved);
        setIsDailyMode(state.isDailyMode || false);
        if (state.selectedCell) {
          setSelectedCell(state.selectedCell);
        }
        triggerToast('წინა თამაში წარმატებით აღდგა! 💾', 'success');
        return; // Avoid auto-starting new game
      } catch (err) {
        console.error('Failed to parse saved game', err);
      }
    }

    // Default auto start
    startNewGame('easy', false);
  }, []);

  // Save game state dynamically
  useEffect(() => {
    if (grid.length > 0 && !isSolved) {
      const gameState = {
        grid,
        solution,
        difficulty,
        timer,
        mistakes,
        hintsUsed,
        isTimerActive,
        isSolved,
        isDailyMode,
        selectedCell,
      };
      localStorage.setItem('sudoku_saved_game', JSON.stringify(gameState));

      // Highlight saving only when grid structure/notes actually change
      const currentGridString = JSON.stringify(grid.map((row) => row.map((c) => ({ v: c.value, e: c.error, n: c.notes }))));
      if (!prevGridStringRef.current) {
        prevGridStringRef.current = currentGridString;
      } else if (prevGridStringRef.current !== currentGridString) {
        prevGridStringRef.current = currentGridString;
        setIsSaving(true);
      }
    }
  }, [grid, solution, difficulty, timer, mistakes, hintsUsed, isTimerActive, isSolved, isDailyMode, selectedCell]);

  // Reset "Saving..." indicator after a short delay
  useEffect(() => {
    if (isSaving) {
      const timeoutId = setTimeout(() => {
        setIsSaving(false);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isSaving]);

  // Keep track of the active timer
  useEffect(() => {
    let intervalId: any = null;
    if (isTimerActive && !isSolved) {
      intervalId = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimerActive, isSolved]);

  // Generates a seed based on the current date for Daily mode
  const getDailySeed = (): number => {
    const today = new Date();
    const seedStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    return parseInt(seedStr);
  };

  // Starts a new game session
  const startNewGame = (selectedDiff: Difficulty = difficulty, checkDailyMode = false) => {
    setDifficulty(selectedDiff);
    setIsDailyMode(checkDailyMode);
    
    // Create new board
    const { puzzle, solution: solved } = generatePuzzle(selectedDiff);
    
    // Construct grid items
    const initialGrid: Cell[][] = puzzle.map((rowArr, r) =>
      rowArr.map((val, c) => ({
        row: r,
        col: c,
        value: val,
        initial: val > 0,
        error: false,
        notes: [],
      }))
    );

    setGrid(initialGrid);
    setSolution(solved);
    setTimer(0);
    setIsTimerActive(true);
    setMistakes(0);
    setHintsUsed(0);
    setSelectedCell(null);
    setIsNoteMode(false);
    setIsSolved(false);
    setShowWinModal(false);

    // Save to local storage
    localStorage.removeItem('sudoku_saved_game');

    const modeText = checkDailyMode ? 'ყოველდღიური' : 'ახალი შემთხვევითი';
    const diffLabel = selectedDiff === 'easy' ? 'მარტივი' : selectedDiff === 'medium' ? 'საშუალო' : 'რთული';
    triggerToast(`${modeText} სუდოკუ (${diffLabel}) გენერირებულია! 🎮`, 'success');
  };

  // Reset active board to initially loaded grid
  const handleRestartCurrent = () => {
    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ მიმდინარე თავსატეხის თავიდან დაწყება? ყველა შევსებული ციფრი წაიშლება.')) {
      const resetGrid = grid.map((rowArr) =>
        rowArr.map((cell) => ({
          ...cell,
          value: cell.initial ? cell.value : 0,
          error: false,
          notes: [],
        }))
      );
      setGrid(resetGrid);
      setTimer(0);
      setMistakes(0);
      setHintsUsed(0);
      setSelectedCell(null);
      setIsSolved(false);
      setIsTimerActive(true);
      triggerToast('თავსატეხი გასუფთავდა! 🔄', 'info');
    }
  };

  // Set grid values, validating constraints in real-time
  const handleCellValueChange = (row: number, col: number, newValue: number) => {
    if (isSolved) return;

    const cell = grid[row][col];
    if (cell.initial) return; // Prevent changing fixed numbers

    // If setting empty value (clearing cell)
    if (newValue === 0) {
      const updatedGrid = grid.map((rowArr, r) =>
        rowArr.map((cCell, c) => {
          if (r === row && c === col) {
            return { ...cCell, value: 0, error: false, notes: [] };
          }
          return cCell;
        })
      );
      setGrid(updatedGrid);
      return;
    }

    // Verify if placement matches the solved board
    const correctValue = solution[row][col];
    const isIncorrect = newValue !== correctValue;

    if (isIncorrect) {
      setMistakes((prev) => prev + 1);
      sound.playWrong();
      triggerToast('არასწორი ციფრი! შეცდომა დაფიქსირდა ⚠️', 'error');
    } else {
      sound.playCorrect();
    }

    // Compile new grid state
    const updatedGrid = grid.map((rowArr, r) =>
      rowArr.map((cCell, c) => {
        if (r === row && c === col) {
          return {
            ...cCell,
            value: newValue,
            error: isIncorrect,
            notes: [], // Clear any micro-notes automatically on direct fill
          };
        }
        return cCell;
      })
    );

    // Clean up same candidate note entries from affected cells in same row/col/subgrid on successful input
    if (!isIncorrect) {
      const startRow = row - (row % 3);
      const startCol = col - (col % 3);
      
      for (let i = 0; i < 9; i++) {
        // Clear row note entries
        if (updatedGrid[row][i].notes.includes(newValue)) {
          updatedGrid[row][i].notes = updatedGrid[row][i].notes.filter(n => n !== newValue);
        }
        // Clear col note entries
        if (updatedGrid[i][col].notes.includes(newValue)) {
          updatedGrid[i][col].notes = updatedGrid[i][col].notes.filter(n => n !== newValue);
        }
      }
      // Clear 3x3 block note entries
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const currCell = updatedGrid[startRow + i][startCol + j];
          if (currCell.notes.includes(newValue)) {
            currCell.notes = currCell.notes.filter(n => n !== newValue);
          }
        }
      }
    }

    setGrid(updatedGrid);

    // Auto-check for completeness / Win condition
    checkWinCondition(updatedGrid);
  };

  // Toggle Pencil Note in cell’s notes list
  const handleToggleNote = (row: number, col: number, noteVal: number) => {
    if (isSolved) return;
    const cell = grid[row][col];
    if (cell.initial || cell.value > 0) return; // Only allow notes in empty cells

    const updatedGrid = grid.map((rowArr, r) =>
      rowArr.map((cCell, c) => {
        if (r === row && c === col) {
          const hasNote = cCell.notes.includes(noteVal);
          const newNotes = hasNote 
            ? cCell.notes.filter(n => n !== noteVal)
            : [...cCell.notes, noteVal].sort();
          return { ...cCell, notes: newNotes };
        }
        return cCell;
      })
    );

    setGrid(updatedGrid);
  };

  // Check if every single cell perfectly matches the prefilled solution
  const checkWinCondition = (currentGrid: Cell[][]) => {
    let win = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentGrid[r][c].value !== solution[r][c]) {
          win = false;
          break;
        }
      }
      if (!win) break;
    }

    if (win) {
      setIsSolved(true);
      setIsTimerActive(false);
      sound.playWin();
      localStorage.removeItem('sudoku_saved_game');
      setTimeout(() => {
        setShowWinModal(true);
      }, 500);
    }
  };

  // Active check on demand (Georgian Check Button "შემოწმება")
  const handleCheckBoard = () => {
    if (isSolved) return;
    
    let wrongCells = 0;
    let emptyCells = 0;

    grid.forEach((rowArr) => {
      rowArr.forEach((cell) => {
        if (cell.value === 0) {
          emptyCells++;
        } else if (cell.value !== solution[cell.row][cell.col]) {
          wrongCells++;
        }
      });
    });

    if (wrongCells === 0 && emptyCells === 0) {
      triggerToast('გილოცავთ! ყველა ციფრი სწორია 💥', 'success');
      return;
    }

    if (wrongCells === 0) {
      triggerToast(`ჯერჯერობით ყველა შეყვანილი ციფრი სწორია! დარჩა ${emptyCells} შესავსები უჯრა. ✨`, 'success');
    } else {
      // Temporarily highlight current error cells in red
      const highlightedGrid = grid.map((rowArr) =>
        rowArr.map((cell) => {
          if (cell.value !== 0 && cell.value !== solution[cell.row][cell.col]) {
            return { ...cell, error: true };
          }
          return cell;
        })
      );
      setGrid(highlightedGrid);
      triggerToast(`აღმოჩენილია ${wrongCells} შეცდომა! არასწორი ციფრები მონიშნულია წითლად. 🛑`, 'error');
    }
  };

  // Reveals a single random empty cell value (Georgian Hint Button "დახმარება")
  const handleUseHint = () => {
    if (isSolved) return;
    if (hintsUsed >= maxHints) {
      triggerToast(`მინიშნებების ლიმიტი ამოიწურა (${maxHints}/${maxHints})! 🙅‍♂️`, 'error');
      return;
    }

    // Collect all empty cells or cells with incorrect inputs
    const emptyPositions: { r: number; c: number }[] = [];
    grid.forEach((rowArr, r) => {
      rowArr.forEach((cell, c) => {
        if (cell.value === 0 || cell.value !== solution[r][c]) {
          emptyPositions.push({ r, c });
        }
      });
    });

    if (emptyPositions.length === 0) return;

    // Pick random target cell
    const randIdx = Math.floor(Math.random() * emptyPositions.length);
    const { r: targetR, c: targetC } = emptyPositions[randIdx];
    const targetVal = solution[targetR][targetC];

    setHintsUsed((prev) => prev + 1);

    const updatedGrid = grid.map((rowArr, r) =>
      rowArr.map((cell, c) => {
        if (r === targetR && c === targetC) {
          return {
            ...cell,
            value: targetVal,
            error: false,
            notes: [],
          };
        }
        return cell;
      })
    );

    setGrid(updatedGrid);
    setSelectedCell({ row: targetR, col: targetC });
    sound.playCorrect();
    triggerToast(`მინიშნება გამოყენებულია (${hintsUsed + 1}/${maxHints}) 💡`, 'info');

    checkWinCondition(updatedGrid);
  };
  const handleSaveToLeaderboard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim() || 'უცნობი მოთამაშე';

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: cleanName,
      time: timer,
      difficulty,
      mistakes,
      date: new Date().toLocaleDateString('ka-GE'),
    };

    const updatedLeaderboard = [...leaderboard, newEntry];
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('sudoku_leaderboard', JSON.stringify(updatedLeaderboard));
    localStorage.setItem('sudoku_player_name', cleanName);

    setShowWinModal(false);
    setActiveTab('leaderboard');
    triggerToast('შედეგი შენახულია ლიდერბორდში! 🏆', 'success');
  };

  const handleDownloadVictoryCard = () => {
    // 1. Create a high-DPI canvas (1200x630px is perfect for social sharing)
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper to draw beautiful rounded rectangles
    const drawRoundRect = (cCtx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      cCtx.beginPath();
      cCtx.moveTo(x + r, y);
      cCtx.arcTo(x + w, y, x + w, y + h, r);
      cCtx.arcTo(x + w, y + h, x, y + h, r);
      cCtx.arcTo(x, y + h, x, y, r);
      cCtx.arcTo(x, y, x + w, y, r);
      cCtx.closePath();
    };

    // 2. Solid Background color plus deep gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#020617'); // slate-950
    gradient.addColorStop(0.5, '#0f172a'); // slate-900
    gradient.addColorStop(1, '#020617'); // slate-950
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // 3. Ambient lighting glows (glowing elements)
    // Left side warm amber soft glow
    const amberGlow = ctx.createRadialGradient(200, 480, 0, 200, 480, 500);
    amberGlow.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
    amberGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = amberGlow;
    ctx.beginPath();
    ctx.arc(200, 480, 500, 0, Math.PI * 2);
    ctx.fill();

    // Right side rich indigo soft glow
    const indigoGlow = ctx.createRadialGradient(1000, 150, 0, 1000, 150, 600);
    indigoGlow.addColorStop(0, 'rgba(99, 102, 241, 0.16)');
    indigoGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = indigoGlow;
    ctx.beginPath();
    ctx.arc(1000, 150, 600, 0, Math.PI * 2);
    ctx.fill();

    // 4. Background Decorative Grid (Subtle Sudoku cells rendering)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
    const boardX = 720;
    const boardY = 110;
    const boardSize = 400;
    const cellSize = boardSize / 9;

    for (let i = 0; i <= 9; i++) {
      ctx.lineWidth = (i % 3 === 0) ? 2.5 : 1;
      ctx.strokeStyle = (i % 3 === 0) ? 'rgba(148, 163, 184, 0.09)' : 'rgba(148, 163, 184, 0.03)';
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + i * cellSize);
      ctx.lineTo(boardX + boardSize, boardY + i * cellSize);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(boardX + i * cellSize, boardY);
      ctx.lineTo(boardX + i * cellSize, boardY + boardSize);
      ctx.stroke();
    }

    // Faint overlay decorative numbers inside background sudoku grid
    ctx.font = 'bold 16px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(129, 140, 248, 0.12)';
    const sampleNumbers = [
      { r: 0, c: 2, val: 5 }, { r: 1, c: 4, val: 9 }, { r: 2, c: 7, val: 2 },
      { r: 3, c: 0, val: 8 }, { r: 4, c: 4, val: 4 }, { r: 5, c: 8, val: 7 },
      { r: 6, c: 1, val: 3 }, { r: 7, c: 3, val: 6 }, { r: 8, c: 6, val: 1 }
    ];
    sampleNumbers.forEach(n => {
      ctx.fillText(
        n.val.toString(), 
        boardX + n.c * cellSize + cellSize / 2.4, 
        boardY + n.r * cellSize + cellSize / 1.7
      );
    });

    // 5. Elegant Fine Border Outer Frame
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(32, 32, 1136, 566);

    // Decorative quadrant corners
    const cornerLength = 14;
    const corners = [
      [32, 32], [1168, 32], [32, 598], [1168, 598]
    ];
    ctx.strokeStyle = '#6366f1'; // indigo-500
    ctx.lineWidth = 2;
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.moveTo(cx - cornerLength, cy); ctx.lineTo(cx + cornerLength, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - cornerLength); ctx.lineTo(cx, cy + cornerLength);
      ctx.stroke();
    });

    // 6. Typography on the Left Column
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Game Category Badge
    ctx.font = 'bold 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#818cf8'; // indigo-400
    ctx.fillText('📊  S U D O K U  •  ს უ დ ო კ უ', 100, 110);

    // Large main victory declaration (in elegant Georgian)
    ctx.font = '900 54px "Arial-Geo-Bold", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('გილოცავთ მოგებას!', 100, 155);

    ctx.font = '500 18px "Arial-Geo-Bold", system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.fillText('სუდოკუს თავსატეხი წარმატებით და სრულად შეივსო 🎉', 100, 225);

    // Separator line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 290);
    ctx.lineTo(600, 290);
    ctx.stroke();

    // Player Block
    const cleanPlayerName = playerName.trim() || 'უცნობი მოთამაშე';
    ctx.font = 'bold 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText('მოთამაშე / PLAYER', 100, 330);

    ctx.font = '900 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillText(cleanPlayerName, 100, 355);

    // 7. Render 4 Custom Grid Stats Cards on the right inside a glowing panel
    const cardWidth = 220;
    const cardHeight = 105;
    const startX = 665;
    const startY = 160;
    const gapX = 30;
    const gapY = 25;

    const drawStatsCard = (x: number, y: number, label: string, val: string, valColor: string, iconStr: string) => {
      // Background base
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      drawRoundRect(ctx, x, y, cardWidth, cardHeight, 16);
      ctx.fill();

      // Modern border overlay
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Custom bullet indicator
      ctx.fillStyle = valColor;
      ctx.beginPath();
      ctx.arc(x + 25, y + 25, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Info Icon
      ctx.font = '14px system-ui';
      ctx.fillText(iconStr, x + cardWidth - 30, y + 16);

      // Label
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.fillText(label, x + 40, y + 17);

      // Value
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = valColor;
      ctx.fillText(val, x + 25, y + 48);
    };

    // Label Map
    const diffLabel = difficulty === 'easy' ? 'მარტივი' : difficulty === 'medium' ? 'საშუალო' : 'რთული';
    const diffColor = difficulty === 'easy' ? '#10b981' : difficulty === 'medium' ? '#f59e0b' : '#ef4444';

    // Draw cards
    drawStatsCard(startX, startY, 'სირთულე / DIFFICULTY', diffLabel, diffColor, '👑');
    drawStatsCard(startX + cardWidth + gapX, startY, 'დრო / DURATION', formatTime(timer), '#818cf8', '⏱️');
    drawStatsCard(startX, startY + cardHeight + gapY, 'შეცდომები / MISTAKES', `${mistakes}/3`, '#ef4444', '⚠️');
    drawStatsCard(startX + cardWidth + gapX, startY + cardHeight + gapY, 'მინიშნება / HINTS', `${hintsUsed}/${maxHints}`, '#38bdf8', '💡');

    // 8. Watermark/Footer text
    ctx.textAlign = 'center';
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569'; // slate-600
    ctx.fillText('ქართული ინტერაქტიული სუდოკუ • სცადე შენც Google AI Studio-ში 🚀', 600, 560);

    // 9. Process download trigger
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `sudoku_victory_${cleanPlayerName.replace(/\s+/g, '_') || 'player'}.png`;
      link.href = dataUrl;
      link.click();
      triggerToast('საიმიჯო ბარათი წარმატებით ჩამოიტვირთა! 🏆✨', 'success');
    } catch (e) {
      console.error(e);
      triggerToast('ბარათის გადმოწერა ვერ მოხერხდა', 'error');
    }
  };

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sudoku_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sudoku_theme', 'light');
    }
    triggerToast(nextMode ? 'მუქი თემა ჩართულია 🌙' : 'ღია თემა ჩართულია ☀️');
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.toggleMute();
    localStorage.setItem('sudoku_muted', nextMuted ? 'true' : 'false');
    triggerToast(nextMuted ? 'ხმა გამორთულია 🔇' : 'ხმა ჩართულია 🔊');
  };

  const handleClearLeaderboard = () => {
    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ლიდერბორდის სრულად გასუფთავება?')) {
      setLeaderboard([]);
      localStorage.removeItem('sudoku_leaderboard');
      triggerToast('ლიდერბორდი გასუფთავდა! 🧹', 'info');
    }
  };

  // Calculate difficulty distribution for progression
  const totalCompleted = leaderboard.length;
  const easyCount = leaderboard.filter(e => e.difficulty === 'easy').length;
  const mediumCount = leaderboard.filter(e => e.difficulty === 'medium').length;
  const hardCount = leaderboard.filter(e => e.difficulty === 'hard').length;

  const easyPct = totalCompleted > 0 ? (easyCount / totalCompleted) * 100 : 0;
  const mediumPct = totalCompleted > 0 ? (mediumCount / totalCompleted) * 100 : 0;
  const hardPct = totalCompleted > 0 ? (hardCount / totalCompleted) * 100 : 0;

  const chartData = totalCompleted > 0 ? [
    { name: 'მარტივი', value: easyCount, pct: Math.round(easyPct), color: '#10b981' },
    { name: 'საშუალო', value: mediumCount, pct: Math.round(mediumPct), color: '#f59e0b' },
    { name: 'რთული', value: hardCount, pct: Math.round(hardPct), color: '#ef4444' }
  ].filter(item => item.value > 0) : [
    { name: 'მონაცემები არ არის', value: 1, pct: 0, color: '#475569' }
  ];

  const CustomHeaderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg shadow-xl text-[9px] font-extrabold text-slate-200 z-50">
          <p style={{ color: data.color }}>{data.name}: {totalCompleted === 0 ? 0 : data.value} ({data.pct}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 font-sans flex flex-col transition-all duration-300">
      
      {/* Saving State Feedback Badge */}
      {isSaving && (
        <div 
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900/95 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl shadow-2xl shadow-indigo-900/20 select-none animate-fade-in backdrop-blur-sm"
          id="autosave-indicator"
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>ინახება...</span>
        </div>
      )}

      {/* Toast Alert / Notifications */}
      {toastMessage && (
        <div 
          className={`
            fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold tracking-wide transition-all duration-200 animate-slide-in
            ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-400 border-emerald-900'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-400 border-rose-900'
                : 'bg-indigo-950/95 text-indigo-400 border-indigo-900'
            }
          `}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <Info className="w-4 h-4 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* WIN MODAL */}
      {showWinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-800 shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setShowWinModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-350 p-1.5 hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="inline-block p-4 rounded-2xl bg-amber-550/10 text-amber-450 mb-4 text-3xl animate-bounce">
                👑
              </span>
              <h2 className="text-2xl font-black text-slate-100 font-geo tracking-tight leading-tight">
                გილოცავთ, შენ მოიგე! 🎉
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                თავსატეხი წარმატებით შეივსო! შეიყვანეთ თქვენი სახელი ლიდერბორდში ჩასაწერად და შედეგის შესანახად.
              </p>

              {/* Game Stats cards */}
              <div className="grid grid-cols-3 gap-3 my-5">
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-550 uppercase font-bold">დრო</div>
                  <div className="text-sm font-extrabold font-mono text-indigo-400 mt-1">
                    {formatTime(timer)}
                  </div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-555 uppercase font-bold">დონე</div>
                  <div className="text-xs font-bold text-slate-300 mt-1.5">
                    {difficulty === 'easy' ? 'მარტივი' : difficulty === 'medium' ? 'საშუალო' : 'რთული'}
                  </div>
                </div>
                <div className="bg-slate-955/40 p-3 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-550 uppercase font-bold">შეცდომები</div>
                  <div className="text-sm font-extrabold font-mono text-rose-450 mt-1">
                    {mistakes}
                  </div>
                </div>
              </div>

              {/* Form submit name */}
              <form onSubmit={handleSaveToLeaderboard} className="space-y-3.5">
                <div>
                  <label htmlFor="name-input" className="block text-left text-xs font-bold text-slate-400 uppercase mb-1 px-1">
                    თქვენი სახელი:
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={18}
                    placeholder="მაგ. გიორგი"
                    className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-500"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm"
                  id="save-score-btn"
                >
                  <Trophy className="w-4 h-4" />
                  შედეგის შენახვა
                </button>

                <div className="pt-1.5 border-t border-slate-800/60 mt-3.5 text-center">
                  <button
                    type="button"
                    onClick={handleDownloadVictoryCard}
                    className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-850/60 text-indigo-400 hover:text-indigo-300 font-bold rounded-xl transition-all border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-center gap-1.5 text-xs shadow-inner"
                    id="download-card-btn"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    ვიზუალური ბარათის გადმოწერა (სოც. ქსელებისთვის) 🎨
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* APP HEADER BAR */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/80 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black font-mono shadow-lg shadow-indigo-550/20">
            📊
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-100 font-geo flex items-center gap-1.5">
              სუდოკუ <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md font-extrabold uppercase font-mono">ka</span>
            </h1>
            <p className="text-[10px] text-slate-500">
              ინტერაქტიული ქართული თამაში
            </p>
          </div>
        </div>

        {/* Visual Difficulty Distribution Progression in Header with Recharts Donut */}
        <div className="hidden md:flex items-center gap-3 bg-slate-950/40 p-2.5 pl-3 rounded-2xl border border-slate-800/60 shadow-inner select-none">
          <div className="w-10 h-10 flex-shrink-0 relative flex items-center justify-center">
            <PieChart width={40} height={40}>
              <Pie
                data={chartData}
                cx={16}
                cy={16}
                innerRadius={11}
                outerRadius={16}
                paddingAngle={totalCompleted > 1 ? 2 : 0}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <RechartsCell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomHeaderTooltip />} />
            </PieChart>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Trophy className="w-3.5 h-3.5 text-amber-500/80" />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <span>სირთულის განაწილება</span>
              <span className="text-indigo-400 font-mono">({totalCompleted})</span>
            </div>
            
            {/* Detailed distribution indicators */}
            <div className="flex items-center gap-3 mt-0.5 text-[9px] font-bold">
              <span className="flex items-center gap-1 text-emerald-400 hover:opacity-80 transition-opacity cursor-help" title={`მარტივი: ${easyCount} თამაში`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{easyCount} ({totalCompleted > 0 ? Math.round(easyPct) : 0}%)</span>
              </span>
              <span className="flex items-center gap-1 text-amber-400 hover:opacity-80 transition-opacity cursor-help" title={`საშუალო: ${mediumCount} თამაში`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{mediumCount} ({totalCompleted > 0 ? Math.round(mediumPct) : 0}%)</span>
              </span>
              <span className="flex items-center gap-1 text-rose-400 hover:opacity-80 transition-opacity cursor-help" title={`რთული: ${hardCount} თამაში`}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{hardCount} ({totalCompleted > 0 ? Math.round(hardPct) : 0}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global preferences bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-155 dark:hover:border-slate-800 transition-all"
            id="theme-toggle"
            title="ტონალობის შეცვლა"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleToggleMute}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-155 dark:hover:border-slate-800 transition-all"
            id="mute-toggle"
            title="ხმის ჩართვა/გამორთვა"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Mobile View tab switches */}
          <div className="flex sm:hidden p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'game' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-500'
              }`}
              id="tab-game-btn"
            >
              თამაში
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'leaderboard' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-500'
              }`}
              id="tab-lb-btn"
            >
              ლიდერი
            </button>
          </div>
        </div>
      </header>

      {/* MAIN GAME CONTAINER / TWO PANEL LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Game Stats */}
        <section className={`col-span-1 lg:col-span-3 space-y-5 ${activeTab !== 'game' ? 'hidden sm:block' : ''}`}>
          
          {/* Game controls and difficulty selector card */}
          <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-md">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Gamepad2 className="w-4 h-4" />
              🕹️ მართვა
            </div>

            {/* Difficulty choosing label */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                სირთულის დონე:
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                  const isActive = difficulty === level;
                  const label = level === 'easy' ? 'მარტივი' : level === 'medium' ? 'საშუალო' : 'რთული';
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setDifficulty(level);
                        startNewGame(level, isDailyMode);
                      }}
                      className={`
                        py-2 text-[10px] font-extrabold rounded-lg transition-all capitalize
                        ${
                          isActive
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }
                      `}
                      id={`level-selector-${level}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Modes selection */}
            <div className="space-y-2 mb-5">
              <div className="flex gap-2">
                <button
                  onClick={() => startNewGame(difficulty, false)}
                  className="flex-1 py-3 px-4 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 text-xs"
                  id="new-game-btn"
                >
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  ახალი თამაში
                </button>
              </div>

              {/* Special Daily Puzzle seed solver */}
              <button
                onClick={() => {
                  // Setup daily seed mode
                  startNewGame('medium', true);
                  // Optionally, triggers customized experience
                  triggerToast('დაიწყო დღევანდელი საერთო თავსატეხი! 🗓️', 'success');
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs border ${
                  isDailyMode
                    ? 'bg-amber-100 border-amber-200 text-amber-800'
                    : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 hover:border-slate-200 text-slate-700 dark:text-slate-350 dark:hover:text-slate-100 border-transparent'
                }`}
                id="daily-game-btn"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                დღიური თავსატეხი
              </button>
            </div>

            {/* Control Check Board & Hint triggers */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={handleCheckBoard}
                className="py-2.5 px-3 border border-indigo-150 dark:border-slate-750 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800/35 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                id="check-board-btn"
                title="ნახეთ სწორად შეყავთ თუ არა ციფრები"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                შემოწმება
              </button>

              <button
                onClick={handleUseHint}
                className="py-2.5 px-3 border border-amber-150 dark:border-slate-750 text-amber-700 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-800/35 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                id="hint-btn"
                title={`Reveals correct value (${hintsUsed}/${maxHints} used)`}
              >
                <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-pulse" />
                დახმარება ({maxHints - hintsUsed})
              </button>
            </div>
          </div>

          {/* Quick guide of Sudoku Rules */}
          <div className="bg-slate-100/60 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
            <h4 className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 mb-1.5 select-none">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              როგორ ვითამაშოთ?
            </h4>
            <p className="leading-relaxed">
              შეავსეთ 9x9 ბადე ისე, რომ თითოეული სვეტი, სტრიქონი და მთლიანი 3x3 კვადრატი შეიცავდეს ციფრებს 1-დან 9-მდე გამეორების გარეშე.
            </p>
            <div className="mt-2.5 p-1.5 bg-white/50 dark:bg-slate-950/20 rounded-lg text-[10px] font-mono leading-tight">
              ⌨️ <span className="font-bold">ნავიგაცია:</span> ისრები <br />
              📝 <span className="font-bold">ზომა:</span> 1-9 ციფრები <br />
              ✏️ <span className="font-bold">მონიშვნა:</span> კლავიში 'N'
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: The active Board */}
        <section className={`col-span-1 lg:col-span-5 flex flex-col items-center gap-4 ${activeTab !== 'game' ? 'hidden sm:flex' : ''}`}>
          
          {/* Stats top display bar (Timer, Mistakes) */}
          <div className="w-full flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/65 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-md select-none">
            
            {/* Timer container */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                ⏱️
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
                  დრო
                </span>
                <span className="text-sm font-extrabold font-mono text-slate-700 dark:text-slate-200">
                  {formatTime(timer)}
                </span>
              </div>
              <button
                onClick={() => setIsTimerActive(!isTimerActive)}
                className={`p-1 rounded-lg border text-[10px] font-bold ${
                  isTimerActive 
                    ? 'border-rose-100 text-rose-500 hover:bg-rose-50 dark:border-rose-950 dark:hover:bg-rose-950/30' 
                    : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50 dark:border-emerald-950 dark:hover:bg-emerald-950/30'
                }`}
                title={isTimerActive ? "შეჩერება" : "გაგრძელება"}
                id="timer-control-btn"
              >
                {isTimerActive ? 'პაუზა' : 'დაწყება'}
              </button>
            </div>

            {/* Mistakes container */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                ⚠️
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
                  შეცდომები
                </span>
                <span className="text-sm font-semibold font-mono text-rose-500">
                  {mistakes}
                </span>
              </div>
            </div>

            {/* Restart current puzzle trigger */}
            <button
              onClick={handleRestartCurrent}
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all"
              title="მიმდინარე თამაშის გადატვირთვა"
              id="restart-current-btn"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* MAIN GRID */}
          <div className="w-full">
            <SudokuGrid
              grid={grid}
              selectedCell={selectedCell}
              onSelectCell={(row, col) => setSelectedCell({ row, col })}
              onCellValueChange={handleCellValueChange}
              onToggleNote={handleToggleNote}
              isNoteMode={isNoteMode}
              onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
              solution={solution}
              isSolved={isSolved}
            />
          </div>

          {/* Visual Indicators/Labels */}
          {isDailyMode && (
            <div className="text-[11px] font-bold flex items-center gap-1 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full select-none">
              <Calendar className="w-3.5 h-3.5" />
              ყოველდღიური თავსატეხი #{getDailySeed()}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Leaderboards */}
        <section className={`col-span-1 lg:col-span-4 ${activeTab !== 'leaderboard' ? 'hidden sm:block' : ''}`}>
          <Leaderboard 
            entries={leaderboard} 
            onClearLeaderboard={handleClearLeaderboard}
            currentDifficulty={difficulty}
          />
        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-5 border-t border-slate-200/55 dark:border-slate-800/65 text-center text-[11px] text-slate-400 dark:text-slate-500 select-none">
        <div>
          სუდოკუ © 2026. შექმნილია უმაღლესი დიზაინისა და თამაშის გამოცდილებისთვის.
        </div>
      </footer>
    </div>
  );
}
