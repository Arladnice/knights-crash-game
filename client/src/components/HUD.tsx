import { useRef, useState, useEffect } from 'react';
import { useGameStore, GamePhase } from '../store/useGameStore';

export const HUD = () => {
  const { phase, multiplier, timeToStart, isConnected, isDemoMode, retryLive, balance, history } = useGameStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    if (scrollRef.current) {
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeftRef.current = scrollRef.current.scrollLeft;
    }
  };

  const onMouseLeave = () => { isDown.current = false; };
  const onMouseUp = () => { isDown.current = false; };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const isWarning = multiplier > 2.0;
  const isDanger = multiplier > 5.0;
  
  const multColor = phase === GamePhase.CRASHED ? '#ef4444' : (isDanger ? '#fbbf24' : (isWarning ? '#a3e635' : '#ffffff'));

  const multFontSize = isMobile ? 'clamp(48px, 15vw, 80px)' : '120px';
  const padding = isMobile ? '10px' : '20px';

  return (
    <div style={{ padding, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', pointerEvents: 'none' }}>
      
      {/* Top Bar: Balance & History */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
        
        {/* Balance Panel */}
        <div className="glass-panel" style={{ padding: isMobile ? '8px 14px' : '12px 24px', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: isMobile ? '11px' : '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Balance</span>
          <span style={{ fontSize: isMobile ? '16px' : '24px', fontWeight: '900', color: '#22c55e' }}>
            ${balance.toFixed(2)}
          </span>
        </div>

        {/* History Panel */}
        <div 
          ref={scrollRef}
          className="glass-panel no-scrollbar" 
          style={{ 
            padding: isMobile ? '6px 10px' : '8px 16px', 
            display: 'flex', 
            gap: isMobile ? '4px' : '8px', 
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
            cursor: 'grab'
          }}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onWheel={(e) => {
            if (scrollRef.current) {
              scrollRef.current.scrollLeft += e.deltaY;
            }
          }}
        >
          {history.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '12px' : '14px', fontWeight: 'bold', margin: '4px 0' }}>HISTORY</div>}
          {history.slice().reverse().map((m, i) => {
            const hColor = m >= 5 ? '#a3e635' : (m >= 2 ? '#fbbf24' : '#ef4444');
            return (
              <div key={i} style={{ 
                padding: isMobile ? '3px 6px' : '4px 8px', 
                borderRadius: '6px', 
                background: `${hColor}20`, 
                color: hColor,
                fontWeight: 'bold',
                fontSize: isMobile ? '11px' : '14px',
                flexShrink: 0
              }}>
                {m.toFixed(2)}x
              </div>
            );
          })}
        </div>
      </div>

      {!isConnected && (
        <div style={{ marginTop: isMobile ? '10px' : '16px', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '6px 14px', borderRadius: '999px', fontSize: isMobile ? '12px' : '13px', pointerEvents: 'auto' }}>
          <span style={{ color: isDemoMode ? '#38bdf8' : '#f59e0b', fontWeight: 'bold' }}>
            {isDemoMode ? 'DEMO MODE (Локальная симуляция)' : 'Подключение к серверу...'}
          </span>
          {isDemoMode && import.meta.env.VITE_SOCKET_URL && (
            <button
              onClick={retryLive}
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#bae6fd', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '999px', padding: '2px 10px', cursor: 'pointer', fontSize: '12px' }}
            >
              Live
            </button>
          )}
        </div>
      )}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          fontSize: multFontSize, 
          fontWeight: '900', 
          color: multColor, 
          textShadow: `0 0 30px ${multColor}40`, 
          transition: 'color 0.3s',
          lineHeight: 1
        }}>
          {multiplier.toFixed(2)}x
        </div>

        {phase === GamePhase.WAITING && (
          <div style={{ marginTop: isMobile ? '15px' : '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: isMobile ? '200px' : '300px' }}>
            <div style={{ fontSize: isMobile ? '24px' : '32px', color: '#f8fafc', fontWeight: 'bold', marginBottom: '10px' }}>
              {(timeToStart / 1000).toFixed(1)}s
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${(timeToStart / 10000) * 100}%`, 
                background: '#3b82f6', 
                transition: 'width 0.1s linear'
              }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Ожидание игры
            </div>
          </div>
        )}
        
        {phase === GamePhase.CRASHED && (
          <div style={{ fontSize: isMobile ? '32px' : '48px', color: '#ef4444', fontWeight: 'bold', marginTop: '10px', textShadow: '0 0 20px rgba(239, 68, 68, 0.6)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            КРАШ!
          </div>
        )}
      </div>

    </div>
  );
}
