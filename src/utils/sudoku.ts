import { Difficulty } from '../types';

// Check if num can be placed at board[row][col]
export function isValid(board: number[][], row: number, col: number, num: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num && x !== col) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num && x !== row) return false;
  }

  // Check 3x3 subgrid
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (
        board[i + startRow][j + startCol] === num &&
        (i + startRow !== row || j + startCol !== col)
      ) {
        return false;
      }
    }
  }

  return true;
}

// Solves the board using recursive backtracking
export function solveSudoku(board: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Counts the number of solutions for a given board up to a limit
export function countSolutions(board: number[][], limit = 2): number {
  let count = 0;

  function backtrack(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              backtrack(grid);
              grid[row][col] = 0;
              if (count >= limit) return true; // Stop early
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }

  const gridCopy = board.map((row) => [...row]);
  backtrack(gridCopy);
  return count;
}

// Fills diagonal 3x3 boxes (independent of each other)
function fillDiagonal(board: number[][]) {
  for (let i = 0; i < 9; i += 3) {
    fillBox(board, i, i);
  }
}

// Fills a 3x3 box with random unique numbers
function fillBox(board: number[][], row: number, col: number) {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  // Shuffle nums
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  let idx = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      board[row + i][col + j] = nums[idx++];
    }
  }
}

// Generates a fully solved Sudoku board
export function generateFullBoard(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillDiagonal(board);
  solveSudoku(board);
  return board;
}

// Generates a puzzle and its solution based on difficulty
export function generatePuzzle(difficulty: Difficulty): {
  puzzle: number[][];
  solution: number[][];
} {
  const solution = generateFullBoard();
  const puzzle = solution.map((row) => [...row]);

  // Determine target prefilled cell count
  // Easy: 38-42 cells prefilled (39-43 removed)
  // Medium: 30-34 cells prefilled (47-51 removed)
  // Hard: 23-26 cells prefilled (55-58 removed)
  let targetFilled = 40;
  if (difficulty === 'medium') {
    targetFilled = 32;
  } else if (difficulty === 'hard') {
    targetFilled = 25;
  }

  const cellsToRemove = 81 - targetFilled;
  let removed = 0;

  // Generate list of all cell positions and shuffle them
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Try to remove cells. To guarantee exactly one solution, we check if removing details leaves 1 solution.
  for (let i = 0; i < positions.length && removed < cellsToRemove; i++) {
    const [row, col] = positions[i];
    const val = puzzle[row][col];

    puzzle[row][col] = 0;

    // Check if the solution counts are still unique
    if (countSolutions(puzzle, 2) === 1) {
      removed++;
    } else {
      // Revert if it created multiple solutions
      puzzle[row][col] = val;
    }
  }

  // Back-up grid generation in case removing with strict uniqueness yielded too few removals
  // If we couldn't remove enough while preserving strict solution uniqueness (common in hard levels),
  // we can force remove some numbers, or accept the highest solvable state.
  if (81 - (81 - removed) > targetFilled) {
    // For hard, let's keep removing cells even if it slightly compromises strict 1-solution bound,
    // though usually with backtracking check we can strip 50+ cells reliably!
    // Let's force-strip if we need to match the difficulty feel.
    let attempts = 0;
    while (81 - removed > targetFilled && attempts < 100) {
      const idx = Math.floor(Math.random() * positions.length);
      const [row, col] = positions[idx];
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
      attempts++;
    }
  }

  return { puzzle, solution };
}

// Format seconds into a MM:SS string
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
