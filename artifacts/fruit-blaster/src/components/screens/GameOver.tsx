import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStatsStore } from '../../store/statsStore';
import { useMoonStore } from '../../store/moonStore';
import { getRankForScore, getMoonRank } from '../../utils/mathUtils';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useEffect } from 'react';

export default function GameOver() {
  const { score, mode, setScreen, resetGame } = useGameStore();
  const { addGamesPlayed, updateBestScore, addLeaderboardEntry } = useStatsStore();
  const moonStats = useMoonStore();
  const { playGameOver, playClick } = useSoundManager();

  const isMoon = mode === 'moon';
  const rank = isMoon ? getMoonRank(score) : getRankForScore(score);
  const moonAccuracy = moonStats.fruitsSliced + moonStats.eclipseOrbsHit > 0
    ? Math.round((moonStats.fruitsSliced / (moonStats.fruitsSliced + moonStats.eclipseOrbsHit)) * 100)
    : 100;

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
        catRank: isMoon ? (rank as any).icon : (rank as any).cat
      });
    }
  }, []);

  const handleReplay = () => {
    playClick();
    resetGame();
    if (isMoon) moonStats.reset();
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

      <GlassPanel className={`w-full max-w-2xl p-8 md:p-12 flex flex-col items-center gap-8 z-10 text-center ${isMoon ? 'border-blue-300/20' : ''}`}>
        <h2 className={`text-5xl md:text-6xl font-black font-orbitron drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] ${isMoon ? 'text-blue-100 drop-shadow-[0_0_20px_rgba(140,180,255,0.5)]' : 'text-destructive'}`}>
          {isMoon ? 'THE SHRINE FADES' : 'GAME OVER'}
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
            {isMoon ? (rank as any).icon : (rank as any).cat}
          </motion.div>
          <h3 className={`text-3xl font-orbitron font-bold text-transparent bg-clip-text ${isMoon ? 'bg-gradient-to-r from-indigo-300 to-blue-100' : 'bg-gradient-to-r from-primary to-accent'}`}>
            {rank.title}
          </h3>
        </motion.div>

        {isMoon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
            className="w-full bg-black/40 rounded-3xl p-6 border border-blue-300/10"
          >
            <span className="text-sm text-blue-200/50 uppercase tracking-widest block mb-4">Results Scroll</span>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="Fruits Sliced" value={moonStats.fruitsSliced} />
              <Stat label="Perfect Slices" value={moonStats.perfectSlices} />
              <Stat label="Accuracy" value={`${moonAccuracy}%`} />
              <Stat label="Highest Combo" value={moonStats.highestCombo} />
              <Stat label="Eclipse Orbs Hit" value={moonStats.eclipseOrbsHit} />
              <Stat label="Moon Blessings" value={moonStats.moonBlessingsActivated} />
              <Stat
                label="Survival Time"
                value={`${Math.floor(moonStats.survivalSeconds / 60)}:${(Math.floor(moonStats.survivalSeconds) % 60).toString().padStart(2, '0')}`}
              />
            </div>
          </motion.div>
        )}

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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl font-bold font-orbitron text-white">{value}</span>
      <span className="text-[10px] text-blue-200/40 uppercase tracking-widest mt-1">{label}</span>
    </div>
  );
}
