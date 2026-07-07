import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mode: string;
  date: string;
  catRank: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

interface StatsState {
  gamesPlayed: number;
  totalFruitsSliced: number;
  bombsHit: number;
  bestCombo: number;
  bestScore: number;
  totalPlayTimeSeconds: number;
  swingsMissed: number; // for accuracy
  swingsHit: number;
  
  leaderboard: LeaderboardEntry[];
  achievements: Achievement[];
  
  addGamesPlayed: () => void;
  addFruitsSliced: (count: number) => void;
  addBombsHit: () => void;
  updateBestCombo: (combo: number) => void;
  updateBestScore: (score: number) => void;
  addPlayTime: (seconds: number) => void;
  addSwing: (hit: boolean) => void;
  
  addLeaderboardEntry: (entry: LeaderboardEntry) => void;
  unlockAchievement: (id: string) => void;
  updateAchievementProgress: (id: string, progress: number) => void;
}

// Helper to initialize achievements
const initialAchievements: Achievement[] = [
  { id: 'first_blood', title: 'First Blood', description: 'Slice your first fruit', icon: '🍎', unlocked: false, progress: 0, maxProgress: 1 },
  { id: 'century', title: 'Century', description: 'Slice 100 fruits', icon: '💯', unlocked: false, progress: 0, maxProgress: 100 },
  { id: 'millennium', title: 'Millennium', description: 'Slice 1000 fruits', icon: '🌟', unlocked: false, progress: 0, maxProgress: 1000 },
  { id: 'pacifist', title: 'Pacifist', description: 'Complete a game without hitting a bomb', icon: '🕊️', unlocked: false, progress: 0, maxProgress: 1 },
  { id: 'untouchable', title: 'Untouchable', description: 'Finish with all 3 lives', icon: '🛡️', unlocked: false, progress: 0, maxProgress: 1 },
  { id: 'hot_streak', title: 'Hot Streak', description: '5x combo', icon: '🔥', unlocked: false, progress: 0, maxProgress: 5 },
  { id: 'unstoppable', title: 'Unstoppable', description: '10x combo', icon: '🚀', unlocked: false, progress: 0, maxProgress: 10 },
  { id: 'legendary', title: 'Legendary', description: '20x combo', icon: '⚡', unlocked: false, progress: 0, maxProgress: 20 },
  { id: 'fruit_god', title: 'FRUIT GOD', description: '50x combo', icon: '👑', unlocked: false, progress: 0, maxProgress: 50 },
  { id: 'watermelon_warrior', title: 'Watermelon Warrior', description: 'Slice 50 watermelons', icon: '🍉', unlocked: false, progress: 0, maxProgress: 50 },
];

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      gamesPlayed: 0,
      totalFruitsSliced: 0,
      bombsHit: 0,
      bestCombo: 0,
      bestScore: 0,
      totalPlayTimeSeconds: 0,
      swingsMissed: 0,
      swingsHit: 0,
      
      leaderboard: [],
      achievements: initialAchievements,
      
      addGamesPlayed: () => set((state) => ({ gamesPlayed: state.gamesPlayed + 1 })),
      addFruitsSliced: (count) => set((state) => {
        const newTotal = state.totalFruitsSliced + count;
        // Achievement checks could go here or in a separate effect
        return { totalFruitsSliced: newTotal };
      }),
      addBombsHit: () => set((state) => ({ bombsHit: state.bombsHit + 1 })),
      updateBestCombo: (combo) => set((state) => ({ bestCombo: Math.max(state.bestCombo, combo) })),
      updateBestScore: (score) => set((state) => ({ bestScore: Math.max(state.bestScore, score) })),
      addPlayTime: (seconds) => set((state) => ({ totalPlayTimeSeconds: state.totalPlayTimeSeconds + seconds })),
      addSwing: (hit) => set((state) => ({ 
        swingsHit: state.swingsHit + (hit ? 1 : 0),
        swingsMissed: state.swingsMissed + (!hit ? 1 : 0)
      })),
      
      addLeaderboardEntry: (entry) => set((state) => {
        const newLeaderboard = [...state.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 20);
        return { leaderboard: newLeaderboard };
      }),
      
      unlockAchievement: (id) => set((state) => ({
        achievements: state.achievements.map(a => a.id === id && !a.unlocked ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a)
      })),
      
      updateAchievementProgress: (id, amount) => set((state) => ({
        achievements: state.achievements.map(a => {
          if (a.id === id && !a.unlocked) {
            const newProgress = Math.min(a.progress + amount, a.maxProgress);
            if (newProgress >= a.maxProgress) {
              return { ...a, progress: newProgress, unlocked: true, unlockedAt: new Date().toISOString() };
            }
            return { ...a, progress: newProgress };
          }
          return a;
        })
      }))
    }),
    {
      name: 'fruit-blaster-stats',
    }
  )
);
