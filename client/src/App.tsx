import { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { BetPanel } from './components/BetPanel';
import { HUD } from './components/HUD';
import { StatsPanel } from './components/StatsPanel';
import { GameCanvas } from './game/GameCanvas';
import './index.css';

function App() {
  const connect = useGameStore(s => s.connect);
  const disconnect = useGameStore(s => s.disconnect);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="app-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 3D Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <GameCanvas />
      </div>

      {/* UI Overlay */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        <HUD />
        
        {/* Bottom row */}
        <div style={{ 
          display: 'flex', 
          alignItems: isMobile ? 'stretch' : 'flex-end', 
          justifyContent: 'center', 
          flexDirection: isMobile ? 'column' : 'row',
          padding: isMobile ? '0 10px 10px 10px' : '0 20px 20px 20px', 
          gap: isMobile ? '10px' : '20px', 
          pointerEvents: 'auto' 
        }}>
          {!isMobile && <StatsPanel />}
          <BetPanel isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

export default App;
