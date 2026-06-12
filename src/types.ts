export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Cell {
  row: number;
  col: number;
  value: number; // 0 represents empty
  initial: boolean; // Pre-filled cells locked visually
  error: boolean; // Marked if violating constraints or wrong
  notes: number[]; // Pencil-marked candidates (1-9)
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  time: number; // in seconds
  difficulty: Difficulty;
  mistakes: number;
  date: string;
}

export interface GameStats {
  score: number;
  completedGames: number;
}
