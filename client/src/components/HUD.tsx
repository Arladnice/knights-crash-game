import { useGameStore, GamePhase } from '../store/useGameStore';

export const HUD = () => {
  const { phase, multiplier, timeToStart, isConnected } = useGameStore();

  const isWarning = multiplier > 2.0;
  const isDanger = multiplier > 5.0;
  
  const multColor = phase === GamePhase.CRASHED ? '#ef4444' : (isDanger ? '#fbbf24' : (isWarning ? '#a3e635' : '#ffffff'));

  return (
    <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
      {!isConnected && <div style={{ color: '#ef4444', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px', marginBottom: '20px' }}>Связь с сервером потеряна</div>}
      
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
        <div className="glass-panel" style={{ fontSize: '24px', color: '#e2e8f0', marginTop: '20px', padding: '10px 30px', fontWeight: 'bold' }}>
          Ожидание: {(timeToStart / 1000).toFixed(1)}с
        </div>
      )}
      {phase === GamePhase.CRASHED && (
        <div style={{ fontSize: '48px', color: '#ef4444', fontWeight: 'bold', marginTop: '10px', textShadow: '0 0 20px rgba(239, 68, 68, 0.6)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          КРАШ!
        </div>
      )}
    </div>
  );
}
