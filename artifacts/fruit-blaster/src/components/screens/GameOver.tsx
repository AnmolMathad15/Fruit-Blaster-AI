import { motion } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useStatsStore } from '../../store/statsStore';
import { useMoonStore } from '../../store/moonStore';
import { getRankForScore, getMoonRank } from '../../utils/mathUtils';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useEffect } from 'react';
import { DOJO_ASSET_BASE, MOON_ASSET_BASE, BAMBOO_ASSET_BASE, CRIMSON_ASSET_BASE, IMPERIAL_ASSET_BASE } from '../../constants/GameData';

// Map of game mode to its specific result panel image
const RESULT_PANELS: Partial<Record<GameMode, string>> = {
  'classic': `${DOJO_ASSET_BASE}result-panel.png`,
  'moon': `${MOON_ASSET_BASE}result-panel.png`,
  'bamboo': `${BAMBOO_ASSET_BASE}result-panel.png`,
  'challenge': `${CRIMSON_ASSET_BASE}result-panel.png`,
  'survival': `${IMPERIAL_ASSET_BASE}result-panel.png`,
};

export default function GameOver() {
  const { score, mode, setScreen, resetGame, setSkipWorldIntro } = useGameStore();
  const { addGamesPlayed, updateBestScore, addLeaderboardEntry, bestScore } = useStatsStore();
  const moonStats = useMoonStore();
  const { playGameOver, playClick } = useSoundManager();

  const isMoon = mode === 'moon';
  const isChallenge = mode === 'challenge';
  const rank = isMoon ? getMoonRank(score) : getRankForScore(score);
  const moonAccuracy = moonStats.fruitsSliced + moonStats.eclipseOrbsHit > 0
    ? Math.round((moonStats.fruitsSliced / (moonStats.fruitsSliced + moonStats.eclipseOrbsHit)) * 100)
    : 100;
    
  const panelImage = RESULT_PANELS[mode];

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
    // Return to the world-selection cinematic already parked on its last frame
    // with hotspots live, instead of replaying the intro from the start.
    setSkipWorldIntro(true);
    setScreen('modes');
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Simple CSS confetti simulation could go here, or handled by particle engine */}
      </div>

      <GlassPanel className={`w-full ${isMoon ? 'max-w-xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 md:p-8 flex flex-col items-center gap-5 z-10 text-center relative ${isMoon ? 'border-blue-300/20' : isChallenge ? 'border-red-900/50' : ''}`}>
        {panelImage && (
          <div 
            className="absolute inset-0 z-0 pointer-events-none opacity-80"
            style={{ 
              backgroundImage: `url(${panelImage})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          />
        )}
        {panelImage && (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background: isChallenge
                ? 'linear-gradient(to bottom, rgba(60,5,5,0.72) 0%, rgba(20,0,0,0.80) 60%, rgba(10,0,0,0.88) 100%)'
                : 'rgba(0,0,0,0.60)',
            }}
          />
        )}
        {isChallenge && (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(200,40,10,0.28) 0%, transparent 65%)',
            }}
          />
        )}

        <div className={`relative z-10 w-full flex flex-col items-center ${isMoon ? 'gap-4' : 'gap-8'}`}>
          <h2 className={`${isMoon ? 'text-3xl md:text-4xl' : 'text-5xl md:text-6xl'} font-black font-orbitron ${
            isMoon
              ? 'text-blue-100 drop-shadow-[0_0_20px_rgba(140,180,255,0.5)]'
              : isChallenge
              ? 'text-orange-300 drop-shadow-[0_0_24px_rgba(220,60,10,0.85)]'
              : 'text-destructive drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]'
          }`}>
            {isMoon ? 'THE SHRINE FADES' : isChallenge ? 'THE TEMPLE BURNS' : 'GAME OVER'}
          </h2>
          
          <div className="flex flex-col items-center">
            <span className={`${isMoon ? 'text-base' : 'text-xl'} ${isChallenge ? 'text-orange-200/70' : 'text-white/70'} uppercase tracking-widest mb-1`}>Final Score</span>
            <motion.span 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              className={`${isMoon ? 'text-5xl' : 'text-7xl'} font-bold leading-none ${isChallenge ? 'text-orange-100' : 'text-white'}`}
            >
              {score}
            </motion.span>
            <span className={`text-sm uppercase tracking-widest mt-2 ${isChallenge ? 'text-orange-200/50' : 'text-white/50'}`}>Best Score: {bestScore}</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className={`flex flex-col items-center backdrop-blur-sm rounded-3xl w-full ${isMoon ? 'p-3 bg-black/50 border border-blue-300/10' : isChallenge ? 'p-6 bg-black/60 border border-red-900/40 shadow-[0_0_30px_rgba(180,30,10,0.25)]' : 'p-6 bg-black/50 border border-white/10'}`}
          >
            <span className={`text-sm uppercase mb-1 ${isChallenge ? 'text-orange-200/60' : 'text-white/50'}`}>Your Rank</span>
            <motion.div 
              animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
              className={`${isMoon ? 'text-4xl mb-1' : 'text-6xl mb-4'}`}
            >
              {isMoon ? (rank as any).icon : (rank as any).cat}
            </motion.div>
            <h3 className={`${isMoon ? 'text-xl' : 'text-3xl'} font-orbitron font-bold text-transparent bg-clip-text ${
              isMoon
                ? 'bg-gradient-to-r from-indigo-300 to-blue-100'
                : isChallenge
                ? 'bg-gradient-to-r from-red-400 to-orange-300'
                : 'bg-gradient-to-r from-primary to-accent'
            }`}>
              {rank.title}
            </h3>
          </motion.div>

          {isMoon && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
              className="w-full bg-black/50 backdrop-blur-sm rounded-3xl p-3 border border-blue-300/10"
            >
              <span className="text-xs text-blue-200/50 uppercase tracking-widest block mb-2">Results Scroll</span>
              <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-center">
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

          <div className="flex gap-4 w-full mt-2">
            <Button onClick={handleHome} variant="secondary" className="flex-1">
              Home
            </Button>
            <Button onClick={handleReplay} variant="primary" className="flex-1">
              Play Again
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold font-orbitron text-white">{value}</span>
      <span className="text-[9px] text-blue-200/40 uppercase tracking-widest mt-0.5 leading-tight">{label}</span>
    </div>
  );
}
