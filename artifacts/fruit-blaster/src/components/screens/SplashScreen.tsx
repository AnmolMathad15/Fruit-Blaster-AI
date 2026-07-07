import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export default function SplashScreen() {
  const { setScreen } = useGameStore();

  useEffect(() => {
    // Auto advance after 3 seconds
    const t = setTimeout(() => {
      setScreen('menu');
    }, 3000);
    return () => clearTimeout(t);
  }, [setScreen]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background text-white z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, type: 'spring' }}
        className="relative"
      >
        <h1 className="text-6xl md:text-8xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-primary via-pink-400 to-accent drop-shadow-[0_0_30px_rgba(255,0,255,0.5)]">
          FRUIT
          <br />
          BLASTER
          <br />
          AI
        </h1>
        
        {/* Juice splatters (pure CSS/divs) */}
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
          className="absolute -top-10 -right-10 w-20 h-20 bg-pink-500 rounded-full blur-xl opacity-50"
        />
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}
          className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary rounded-full blur-xl opacity-40"
        />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="mt-20 flex flex-col items-center"
      >
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }} 
            animate={{ width: "100%" }} 
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
        <p className="mt-4 text-white/50 font-orbitron tracking-widest text-sm uppercase">Loading AI Models...</p>
        
        <motion.div 
          animate={{ y: [0, -10, 0] }} 
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="mt-8 text-4xl"
        >
          🐱
        </motion.div>
      </motion.div>
    </div>
  );
}
