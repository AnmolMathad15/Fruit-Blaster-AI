import { useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function useSoundManager() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { soundVolume, musicVolume } = useSettingsStore();
  
  const getCtx = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    // Attempt to resume audio context on interaction
    const handleInteract = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener('click', handleInteract);
    window.addEventListener('keydown', handleInteract);
    return () => {
      window.removeEventListener('click', handleInteract);
      window.removeEventListener('keydown', handleInteract);
      // Close AudioContext to prevent context accumulation across navigations
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, volFactor: number = 1, slideTo?: number) => {
    const ctx = getCtx();
    if (!ctx) return;
    
    const masterVol = soundVolume / 100;
    if (masterVol <= 0) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(masterVol * volFactor, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [soundVolume]);

  const playSlice = useCallback(() => {
    // Quick sharp swoosh
    playTone(600, 'sawtooth', 0.15, 0.3, 200);
    // Add noise burst for juiciness
    const ctx = getCtx();
    if (!ctx) return;
    const masterVol = soundVolume / 100;
    if (masterVol <= 0) return;
    
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2 * masterVol, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);
  }, [playTone, soundVolume]);

  const playBomb = useCallback(() => {
    // Low explosion
    playTone(150, 'square', 0.5, 0.6, 40);
    
    // Add rumble noise
    const ctx = getCtx();
    if (!ctx) return;
    const masterVol = soundVolume / 100;
    if (masterVol <= 0) return;
    
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * masterVol, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);
  }, [playTone, soundVolume]);

  const playCombo = useCallback((comboLevel: number) => {
    // Ascending arpeggio based on combo
    const baseFreq = 440;
    const multi = Math.min(comboLevel, 10) * 50;
    playTone(baseFreq + multi, 'sine', 0.3, 0.4, (baseFreq + multi) * 1.5);
  }, [playTone]);

  const playMiss = useCallback(() => {
    playTone(200, 'triangle', 0.3, 0.2, 100);
  }, [playTone]);

  const playClick = useCallback(() => {
    playTone(800, 'sine', 0.05, 0.1);
  }, [playTone]);

  const playGameOver = useCallback(() => {
    playTone(300, 'sawtooth', 1.0, 0.5, 50);
  }, [playTone]);

  // Pre-game countdown "3, 2, 1" — a short, crisp tick, same pitch each time
  // so it reads as a metronome rather than a melody.
  const playCountdownTick = useCallback(() => {
    playTone(520, 'sine', 0.18, 0.35);
  }, [playTone]);

  // Countdown "GO!" — energetic upward sweep + bright chime layered together.
  const playCountdownGo = useCallback(() => {
    playTone(660, 'square', 0.35, 0.45, 1100);
    const ctx = getCtx();
    if (!ctx) return;
    const masterVol = soundVolume / 100;
    if (masterVol <= 0) return;
    const chime = ctx.createOscillator();
    const gain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(880, ctx.currentTime);
    chime.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(masterVol * 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    chime.connect(gain);
    gain.connect(ctx.destination);
    chime.start(ctx.currentTime);
    chime.stop(ctx.currentTime + 0.4);
  }, [soundVolume]);

  return {
    playSlice,
    playBomb,
    playCombo,
    playMiss,
    playClick,
    playGameOver,
    playCountdownTick,
    playCountdownGo,
  };
}
