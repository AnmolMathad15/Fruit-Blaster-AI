import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const handleNav = (screen: any) => {
    playClick();
    setScreen(screen);
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: ['100vh', '-20vh'],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 10 + (i * 3) % 10, 
              repeat: Infinity, 
              delay: (i * 1.3) % 10,
              ease: "linear"
            }}
            className="absolute text-6xl"
            style={{ left: `${(i * 11) % 100}vw` }}
          >
            {['🍎', '🍉', '🍌', '🥝', '🍍'][i % 5]}
          </motion.div>
        ))}
      </div>

      <GlassPanel className="w-full max-w-md p-8 md:p-12 flex flex-col items-center gap-6 z-10 mx-4">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-5xl font-black font-orbitron text-center mb-4 text-transparent bg-clip-text bg-gradient-to-br from-primary via-pink-400 to-accent"
        >
          FRUIT BLASTER
        </motion.h1>

        <div className="flex flex-col gap-4 w-full">
          <Button onClick={() => handleNav('modes')} variant="primary" className="w-full py-5 text-2xl">
            PLAY
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => handleNav('leaderboard')} variant="secondary">
              Leaderboard
            </Button>
            <Button onClick={() => handleNav('achievements')} variant="secondary">
              Achievements
            </Button>
            <Button onClick={() => handleNav('statistics')} variant="secondary">
              Stats
            </Button>
            <Button onClick={() => handleNav('settings')} variant="secondary">
              Settings
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
