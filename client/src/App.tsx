import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { BetPanel } from './components/BetPanel';
import { HUD } from './components/HUD';
import { GameCanvas } from './game/GameCanvas';
import './index.css';

function App() {
  const connect = useGameStore(s => s.connect);
  const disconnect = useGameStore(s => s.disconnect);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="app-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 3D Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <GameCanvas />
      </div>

      {/* UI Overlay */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        <HUD />
        
        <div style={{ flex: 1 }} />
        
        <BetPanel />
      </div>
    </div>
  );
}

export default App;
