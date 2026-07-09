import { create } from 'zustand';

/**
 * Moon Shrine (Survival Mode) specific state — Spirit Energy meter,
 * Moon Blessing activation, and the survival stats shown on the Results Scroll.
 */
interface MoonState {
  spiritEnergy: number; // 0-100
  addSpiritEnergy: (amount: number) => void;

  moonBlessingActive: boolean;
  blessingSecondsLeft: number;
  activateBlessing: () => void;
  tickBlessing: (dt: number) => void;

  fruitsSliced: number;
  perfectSlices: number;
  eclipseOrbsHit: number;
  highestCombo: number;
  moonBlessingsActivated: number;
  survivalSeconds: number;

  addFruitSliced: (perfect: boolean) => void;
  addEclipseOrbHit: () => void;
  updateHighestCombo: (combo: number) => void;
  tickSurvival: (dt: number) => void;

  reset: () => void;
}

const BLESSING_DURATION = 6; // seconds

export const useMoonStore = create<MoonState>((set, get) => ({
  spiritEnergy: 0,
  addSpiritEnergy: (amount) => set((state) => {
    if (state.moonBlessingActive) return {};
    const next = Math.min(100, state.spiritEnergy + amount);
    return { spiritEnergy: next };
  }),

  moonBlessingActive: false,
  blessingSecondsLeft: 0,
  activateBlessing: () => set((state) => ({
    moonBlessingActive: true,
    blessingSecondsLeft: BLESSING_DURATION,
    spiritEnergy: 0,
    moonBlessingsActivated: state.moonBlessingsActivated + 1,
  })),
  tickBlessing: (dt) => set((state) => {
    if (!state.moonBlessingActive) return {};
    const left = state.blessingSecondsLeft - dt / 60;
    if (left <= 0) return { moonBlessingActive: false, blessingSecondsLeft: 0 };
    return { blessingSecondsLeft: left };
  }),

  fruitsSliced: 0,
  perfectSlices: 0,
  eclipseOrbsHit: 0,
  highestCombo: 0,
  moonBlessingsActivated: 0,
  survivalSeconds: 0,

  addFruitSliced: (perfect) => set((state) => ({
    fruitsSliced: state.fruitsSliced + 1,
    perfectSlices: state.perfectSlices + (perfect ? 1 : 0),
  })),
  addEclipseOrbHit: () => set((state) => ({ eclipseOrbsHit: state.eclipseOrbsHit + 1 })),
  updateHighestCombo: (combo) => set((state) => ({ highestCombo: Math.max(state.highestCombo, combo) })),
  tickSurvival: (dt) => set((state) => ({ survivalSeconds: state.survivalSeconds + dt / 60 })),

  reset: () => set({
    spiritEnergy: 0,
    moonBlessingActive: false,
    blessingSecondsLeft: 0,
    fruitsSliced: 0,
    perfectSlices: 0,
    eclipseOrbsHit: 0,
    highestCombo: 0,
    moonBlessingsActivated: 0,
    survivalSeconds: 0,
  }),
}));

/** Accuracy percentage helper for the Results Scroll. */
export function computeAccuracy(hit: number, missed: number): number {
  const total = hit + missed;
  if (total === 0) return 100;
  return Math.round((hit / total) * 100);
}
