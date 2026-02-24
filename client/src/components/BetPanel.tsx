import { useState } from 'react';
import { useGameStore, GamePhase } from '../store/useGameStore';

export const BetPanel = () => {
  const { phase, placeBet, cashOut, hasBet, myBetAmount, players, multiplier, balance, autoCashoutEnabled, autoCashoutAt, setAutoCashout } = useGameStore();
  const [betInput, setBetInput] = useState('100');
  const [autoCashoutInput, setAutoCashoutInput] = useState(String(autoCashoutAt));

  const me = players.find(p => p.id === useGameStore.getState().socket?.id);
  const potentialWin = (myBetAmount * multiplier).toFixed(2);

  const handleBetChange = (val: string) => {
    let num = Number(val);
    if (isNaN(num)) num = 0;
    if (num > balance) num = balance;
    setBetInput(num.toString());
  };

  const handleQuickBet = (action: 'half' | 'double' | 'min' | 'max') => {
    let current = Number(betInput);
    if (isNaN(current)) current = 0;
    
    let newBet = current;
    if (action === 'half') newBet = Math.max(10, Math.floor(current / 2));
    if (action === 'double') newBet = Math.min(balance, current * 2);
    if (action === 'min') newBet = 10;
    if (action === 'max') newBet = balance;
    
    setBetInput(newBet.toString());
  };

  const sortedPlayers = [...players].sort((a, b) => {
    // Cashed out players first, highest multiplier first
    if (a.cashedOut && !b.cashedOut) return -1;
    if (!a.cashedOut && b.cashedOut) return 1;
    if (a.cashedOut && b.cashedOut) return (b.cashOutMultiplier || 0) - (a.cashOutMultiplier || 0);
    return b.betAmount - a.betAmount; // Playing players sorted by highest bet amount
  });

  return (
    <div style={{ display: 'flex', gap: '20px', margin: '0 auto 40px auto', pointerEvents: 'auto' }}>
      
      {/* Bet Controls */}
      <div className="glass-panel" style={{ padding: '24px', width: '350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Сумма ставки</span>
          <span>$ {balance.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="input-field" 
              type="number" 
              value={betInput} 
              onChange={e => handleBetChange(e.target.value)} 
              disabled={phase !== GamePhase.WAITING || hasBet}
              placeholder="Сумма"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn" style={{ padding: '8px', flex: 1, fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }} onClick={() => handleQuickBet('half')} disabled={phase !== GamePhase.WAITING || hasBet}>/ 2</button>
            <button className="btn" style={{ padding: '8px', flex: 1, fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }} onClick={() => handleQuickBet('double')} disabled={phase !== GamePhase.WAITING || hasBet}>x 2</button>
            <button className="btn" style={{ padding: '8px', flex: 1, fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }} onClick={() => handleQuickBet('min')} disabled={phase !== GamePhase.WAITING || hasBet}>MIN</button>
            <button className="btn" style={{ padding: '8px', flex: 1, fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }} onClick={() => handleQuickBet('max')} disabled={phase !== GamePhase.WAITING || hasBet}>MAX</button>
          </div>

          {/* Auto-cashout row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                onChange={e => setAutoCashout(e.target.checked, Number(autoCashoutInput) || 2.0)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }}
              />
              Авто-кашаут
            </label>
            <input
              className="input-field"
              type="number"
              step="0.1"
              min="1.1"
              value={autoCashoutInput}
              onChange={e => {
                setAutoCashoutInput(e.target.value);
                setAutoCashout(autoCashoutEnabled, Number(e.target.value) || 2.0);
              }}
              style={{ width: '80px', fontSize: '14px', padding: '6px 8px', opacity: autoCashoutEnabled ? 1 : 0.5 }}
              disabled={!autoCashoutEnabled}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>x</span>
          </div>
        </div>
        
        {phase === GamePhase.WAITING && !hasBet && (
          <button className="btn btn-success" onClick={() => placeBet(Number(betInput))} disabled={balance < Number(betInput) || Number(betInput) < 10}>
            СТАВКА
          </button>
        )}

        {phase === GamePhase.WAITING && hasBet && (
          <button className="btn" disabled>
            ОЖИДАНИЕ... ({myBetAmount})
          </button>
        )}

        {phase === GamePhase.RUNNING && (
          <>
            {!hasBet ? (
              <button className="btn" disabled style={{ height: '70px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                <span>ОЖИДАЙТЕ...</span>
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
            КРАШ
          </button>
        )}
      </div>

      {/* Leaderboard */}
      <div className="glass-panel" style={{ padding: '20px', width: '300px', display: 'flex', flexDirection: 'column', gap: '10px', height: 'fit-content', maxHeight: '300px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
          <span>Игроки онлайн: {players.length}</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {sortedPlayers.map((p) => (
            <div key={p.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                background: p.cashedOut ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: p.cashedOut ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                fontSize: '14px'
              }}>
              <span style={{ color: p.cashedOut ? '#22c55e' : '#f8fafc', fontWeight: 'bold' }}>
                {p.name}
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {p.cashedOut && (
                  <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {p.cashOutMultiplier}x
                  </span>
                )}
                <span style={{ color: p.cashedOut ? '#22c55e' : 'var(--text-secondary)' }}>
                  {p.cashedOut ? `+${(p.betAmount * p.cashOutMultiplier!).toFixed(0)}` : p.betAmount}
                </span>
              </div>
            </div>
          ))}
          {players.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>Ждём игроков...</span>}
        </div>
      </div>

    </div>
  );
};
