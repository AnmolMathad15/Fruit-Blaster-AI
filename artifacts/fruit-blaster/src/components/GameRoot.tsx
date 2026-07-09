import React from 'react';
import SplashScreen from './screens/SplashScreen';
import MainMenu from './screens/MainMenu';
import GuardianOathScreen from './screens/GuardianOathScreen';
import WorldSelectionScreen from './screens/WorldSelectionScreen';
import DojoGateIntroScreen from './screens/DojoGateIntroScreen';
import BambooGroveIntroScreen from './screens/BambooGroveIntroScreen';
import CrimsonTempleIntroScreen from './screens/CrimsonTempleIntroScreen';
import ImperialPalaceIntroScreen from './screens/ImperialPalaceIntroScreen';
import GameScreen from './game/GameCanvas';
import GameOver from './screens/GameOver';
import Settings from './screens/Settings';
import Leaderboard from './screens/Leaderboard';
import Achievements from './screens/Achievements';
import Statistics from './screens/Statistics';
import { useGameStore } from '../store/gameStore';
import { ScreenTransition } from './ui/UIComponents';

export default function GameRoot() {
  const { screen } = useGameStore();

  const renderScreen = () => {
    switch (screen) {
      case 'splash': return <SplashScreen />;
      case 'menu': return <MainMenu />;
      case 'guardian': return <GuardianOathScreen />;
      case 'modes': return <WorldSelectionScreen />;
      case 'dojo-intro': return <DojoGateIntroScreen />;
      case 'bamboo-intro': return <BambooGroveIntroScreen />;
      case 'imperial-intro': return <ImperialPalaceIntroScreen />;
      case 'crimson-intro': return <CrimsonTempleIntroScreen />;
      case 'game': return <GameScreen />;
      case 'gameover': return <GameOver />;
      case 'settings': return <Settings />;
      case 'leaderboard': return <Leaderboard />;
      case 'achievements': return <Achievements />;
      case 'statistics': return <Statistics />;
      default: return <MainMenu />;
    }
  };

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-background text-foreground font-sans">
      <ScreenTransition keyName={screen}>
        {renderScreen()}
      </ScreenTransition>
    </div>
  );
}
