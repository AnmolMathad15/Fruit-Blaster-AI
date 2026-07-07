import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStatsStore } from '../../store/statsStore';
import { getRankForScore } from '../../utils/mathUtils';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useEffect } from 'react';

export default function GameOver() {
  const { score, mode, setScreen, resetGame } = useGameStore();
  const { addGamesPlayed, updateBestScore, addLeaderboardEntry } = useStatsStore();
  const { playGameOver, playClick } = useSoundManager();

  const rank = getRankForScore(score);

  useEffect(() => {
    playGameOver();
    addGamesPlayed();
    updateBestScore(score);
    
    // Save to leaderboard if score > 0
    if (score > 0) {
      addLeaderboardEntry({
        id: Math.random().toString(),
        name: 'Player', // Could add input for this later
        score,
        mode,
        date: new Date().toISOString(),
        catRank: rank.cat
      });
    }
  }, []);

  const handleReplay = () => {
    playClick();
    resetGame();
    setScreen('game');
  };

  const handleHome = () => {
    playClick();
    setScreen('menu');
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Simple CSS confetti simulation could go here, or handled by particle engine */}
      </div>

      <GlassPanel className="w-full max-w-2xl p-8 md:p-12 flex flex-col items-center gap-8 z-10 text-center">
        <h2 className="text-5xl md:text-6xl font-black font-orbitron text-destructive drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">
          GAME OVER
        </h2>
        
        <div className="flex flex-col items-center">
          <span className="text-xl text-white/70 uppercase tracking-widest mb-2">Final Score</span>
          <motion.span 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
            className="text-7xl font-bold text-white"
          >
            {score}
          </motion.span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="flex flex-col items-center bg-black/40 rounded-3xl p-6 border border-white/10 w-full"
        >
          <span className="text-sm text-white/50 uppercase mb-2">Your Rank</span>
          <motion.div 
            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl mb-4"
          >
            {rank.cat}
          </motion.div>
          <h3 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            {rank.title}
          </h3>
        </motion.div>

        <div className="flex gap-4 w-full mt-4">
          <Button onClick={handleHome} variant="secondary" className="flex-1">
            Home
          </Button>
          <Button onClick={handleReplay} variant="primary" className="flex-1">
            Play Again
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
