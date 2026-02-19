import { useState } from 'react';
import { useGameStore, GamePhase } from '../store/useGameStore';

export const BetPanel = () => {
  const { phase, placeBet, cashOut, hasBet, myBetAmount, players, multiplier } = useGameStore();
  const [betInput, setBetInput] = useState('100');

  // Find current user's socket ID from store to determine cashout state
  const me = players.find(p => p.id === useGameStore.getState().socket?.id);

  const potentialWin = (myBetAmount * multiplier).toFixed(2);

  return (
    <div className="glass-panel" style={{ margin: '0 auto 40px auto', padding: '24px', width: '400px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Active Players List (Optional, for hype) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', width: '100%' }}>
          Игроки онлайн: {players.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input 
          className="input-field" 
          type="number" 
          value={betInput} 
          onChange={e => setBetInput(e.target.value)} 
          disabled={phase !== GamePhase.WAITING || hasBet}
          placeholder="Сумма ставки"
        />
      </div>
      
      {phase === GamePhase.WAITING && !hasBet && (
        <button className="btn btn-success" onClick={() => placeBet(Number(betInput))}>
          СТАВКА
        </button>
      )}

      {phase === GamePhase.WAITING && hasBet && (
        <button className="btn" disabled>
          ОЖИДАНИЕ ИГРЫ... ({myBetAmount})
        </button>
      )}

      {phase === GamePhase.RUNNING && (
        <>
          {!hasBet ? (
            <button className="btn" disabled style={{ height: '70px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
              <span>ОЖИДАЙТЕ СЛЕД. РАУНДА...</span>
            </button>
          ) : me?.cashedOut ? (
            <button className="btn btn-success" disabled style={{ height: '70px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span>ВЫВЕЛ {me.cashOutMultiplier}x</span>
            </button>
          ) : (
            <button 
              className="btn btn-danger" 
              onClick={cashOut}
              style={{ height: '70px', fontSize: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <span>ЗАБРАТЬ</span>
              <span style={{ fontSize: '14px', opacity: 0.8 }}>{potentialWin}</span>
            </button>
          )}
        </>
      )}

      {phase === GamePhase.CRASHED && (
        <button className="btn" disabled style={{ opacity: 0.5 }}>
          РАУНД ЗАВЕРШЕН
        </button>
      )}
    </div>
  );
};
