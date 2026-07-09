import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] ${className}`}>
      {children}
    </div>
  );
}

export function ScreenTransition({ children, keyName }: { children: ReactNode, keyName: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyName}
        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
      >
        <div className="pointer-events-auto w-full h-full flex items-center justify-center">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false
}: { 
  children: ReactNode; 
  onClick: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}) {
  const base = "relative overflow-hidden font-orbitron font-bold uppercase tracking-wider rounded-xl transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_20px_rgba(200,100,255,0.4)] hover:shadow-[0_0_30px_rgba(200,100,255,0.6)] px-8 py-4 text-xl",
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10 px-6 py-3",
    danger: "bg-destructive text-white shadow-[0_0_20px_rgba(255,0,0,0.4)] hover:bg-destructive/90 px-6 py-3",
    ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5 px-4 py-2"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 ease-out" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
