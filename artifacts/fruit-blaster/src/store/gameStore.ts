import { create } from 'zustand';

export type GameScreen = 'splash' | 'menu' | 'guardian' | 'modes' | 'dojo-intro' | 'bamboo-intro' | 'crimson-intro' | 'imperial-intro' | 'moon-intro' | 'game' | 'pause' | 'gameover' | 'settings' | 'leaderboard' | 'achievements' | 'statistics';
export type GameMode = 'classic' | 'arcade' | 'zen' | 'challenge' | 'survival' | 'bamboo' | 'moon';

interface GameState {
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;
  
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  
  score: number;
  setScore: (score: number | ((prev: number) => number)) => void;
  
  lives: number;
  setLives: (lives: number | ((prev: number) => number)) => void;
  
  combo: number;
  setCombo: (combo: number) => void;
  
  timeLeft: number;
  setTimeLeft: (time: number | ((prev: number) => number)) => void;
  
  isPaused: boolean;
  setPaused: (paused: boolean) => void;
  
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'menu',
  setScreen: (screen) => set({ screen }),
  
  mode: 'classic',
  setMode: (mode) => set({ mode }),
  
  score: 0,
  setScore: (score) => set((state) => ({ score: typeof score === 'function' ? score(state.score) : score })),
  
  lives: 3,
  setLives: (lives) => set((state) => ({ lives: typeof lives === 'function' ? lives(state.lives) : lives })),
  
  combo: 0,
  setCombo: (combo) => set({ combo }),
  
  timeLeft: 60,
  setTimeLeft: (time) => set((state) => ({ timeLeft: typeof time === 'function' ? time(state.timeLeft) : time })),
  
  isPaused: false,
  setPaused: (paused) => set({ isPaused: paused }),
  
  resetGame: () => set({ score: 0, lives: 3, combo: 0, timeLeft: 60, isPaused: false })
}));
