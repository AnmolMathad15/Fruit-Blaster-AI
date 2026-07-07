import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  musicVolume: number;
  soundVolume: number;
  fingerSensitivity: number;
  difficulty: 'Easy' | 'Normal' | 'Hard';
  webcamMirror: boolean;
  swordSkin: string;
  setMusicVolume: (v: number) => void;
  setSoundVolume: (v: number) => void;
  setFingerSensitivity: (v: number) => void;
  setDifficulty: (v: 'Easy' | 'Normal' | 'Hard') => void;
  setWebcamMirror: (v: boolean) => void;
  setSwordSkin: (skin: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 50,
      soundVolume: 70,
      fingerSensitivity: 5,
      difficulty: 'Normal',
      webcamMirror: true,
      swordSkin: 'Default Blade',
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSoundVolume: (v) => set({ soundVolume: v }),
      setFingerSensitivity: (v) => set({ fingerSensitivity: v }),
      setDifficulty: (v) => set({ difficulty: v }),
      setWebcamMirror: (v) => set({ webcamMirror: v }),
      setSwordSkin: (skin) => set({ swordSkin: skin })
    }),
    {
      name: 'fruit-blaster-settings',
    }
  )
);
