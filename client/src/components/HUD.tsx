import { useRef } from 'react';
import { useGameStore, GamePhase } from '../store/useGameStore';

export const HUD = () => {
  const { phase, multiplier, timeToStart, isConnected, balance, history } = useGameStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    if (scrollRef.current) {
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeft.current = scrollRef.current.scrollLeft;
    }
  };

  const onMouseLeave = () => { isDown.current = false; };
  const onMouseUp = () => { isDown.current = false; };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // Scroll fast
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const isWarning = multiplier > 2.0;
  const isDanger = multiplier > 5.0;
  
  const multColor = phase === GamePhase.CRASHED ? '#ef4444' : (isDanger ? '#fbbf24' : (isWarning ? '#a3e635' : '#ffffff'));

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', pointerEvents: 'none' }}>
      
      {/* Top Bar: Balance & History */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        
        {/* Balance Panel */}
        <div className="glass-panel" style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Balance</span>
          <span style={{ fontSize: '24px', fontWeight: '900', color: '#22c55e' }}>
            ${balance.toFixed(2)}
          </span>
        </div>

        {/* History Panel */}
        <div 
          ref={scrollRef}
          className="glass-panel no-scrollbar" 
          style={{ 
            padding: '8px 16px', 
            display: 'flex', 
            gap: '8px', 
            maxWidth: '50%',
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
          {history.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold', margin: '4px 0' }}>HISTORY</div>}
          {history.slice().reverse().map((m, i) => {
            const hColor = m >= 5 ? '#a3e635' : (m >= 2 ? '#fbbf24' : '#ef4444');
            return (
              <div key={i} style={{ 
                padding: '4px 8px', 
                borderRadius: '6px', 
                background: `${hColor}20`, 
                color: hColor,
                fontWeight: 'bold',
                fontSize: '14px',
                flexShrink: 0
              }}>
                {m.toFixed(2)}x
              </div>
            );
          })}
        </div>
      </div>

      {!isConnected && <div style={{ marginTop: '20px', alignSelf: 'center', color: '#ef4444', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px' }}>Связь с сервером потеряна</div>}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          fontSize: '120px', 
          fontWeight: '900', 
          color: multColor, 
          textShadow: `0 0 30px ${multColor}40`, 
          transition: 'color 0.3s',
          lineHeight: 1
        }}>
          {multiplier.toFixed(2)}x
        </div>

        {phase === GamePhase.WAITING && (
          <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
            <div style={{ fontSize: '32px', color: '#f8fafc', fontWeight: 'bold', marginBottom: '10px' }}>
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
            <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Ожидание игры
            </div>
          </div>
        )}
        
        {phase === GamePhase.CRASHED && (
          <div style={{ fontSize: '48px', color: '#ef4444', fontWeight: 'bold', marginTop: '10px', textShadow: '0 0 20px rgba(239, 68, 68, 0.6)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            КРАШ!
          </div>
        )}
      </div>

    </div>
  );
}
