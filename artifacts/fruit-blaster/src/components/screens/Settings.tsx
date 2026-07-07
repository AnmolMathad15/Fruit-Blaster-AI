import { useSettingsStore } from '../../store/settingsStore';
import { useGameStore } from '../../store/gameStore';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function Settings() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();
  const { 
    musicVolume, setMusicVolume, 
    soundVolume, setSoundVolume, 
    fingerSensitivity, setFingerSensitivity,
    webcamMirror, setWebcamMirror,
    swordSkin, setSwordSkin
  } = useSettingsStore();

  const skins = ['Default Blade', 'Fire Blade', 'Ice Blade', 'Galaxy Blade', 'Rainbow Blade', 'Lightning Blade', 'Shadow Blade'];

  const close = () => {
    playClick();
    setScreen('menu');
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <GlassPanel className="w-full max-w-xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-3xl font-orbitron font-bold text-white mb-8 text-center">SETTINGS</h2>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl text-primary font-bold border-b border-white/10 pb-2">Audio</h3>
            <div>
              <label className="flex justify-between text-white/80 mb-2">
                <span>Sound Effects</span>
                <span>{soundVolume}%</span>
              </label>
              <input 
                type="range" min="0" max="100" value={soundVolume}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="flex justify-between text-white/80 mb-2">
                <span>Music (Master)</span>
                <span>{musicVolume}%</span>
              </label>
              <input 
                type="range" min="0" max="100" value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl text-primary font-bold border-b border-white/10 pb-2">Controls</h3>
            <div>
              <label className="flex justify-between text-white/80 mb-2">
                <span>Camera Mirror</span>
                <input 
                  type="checkbox" checked={webcamMirror}
                  onChange={(e) => setWebcamMirror(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </label>
              <p className="text-xs text-white/40">Mirrors the webcam feed so movement feels natural.</p>
            </div>
            {/* Sensitivity could go here if we do smoothing, leaving out for brevity but available in store */}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl text-primary font-bold border-b border-white/10 pb-2">Customization</h3>
            <div>
              <label className="block text-white/80 mb-2">Sword Skin</label>
              <select 
                value={swordSkin} 
                onChange={(e) => setSwordSkin(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:outline-none focus:border-primary"
              >
                {skins.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button onClick={close} variant="primary">DONE</Button>
        </div>
      </GlassPanel>
    </div>
  );
}
