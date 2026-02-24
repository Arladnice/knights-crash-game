import { useGameStore } from '../store/useGameStore';

export const StatsPanel = () => {
  const { sessionBets, sessionWins, sessionLosses, sessionProfit, bestMultiplier, history } = useGameStore();

  const winRate = sessionBets > 0 ? ((sessionWins / sessionBets) * 100).toFixed(1) : '—';
  const profitColor = sessionProfit >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="glass-panel" style={{ padding: '20px', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Сессия
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { label: 'Ставок', value: sessionBets },
          { label: 'Побед', value: sessionWins, color: '#22c55e' },
          { label: 'Проигрышей', value: sessionLosses, color: '#ef4444' },
          { label: 'Win Rate', value: `${winRate}%` },
          { label: 'Лучший x', value: bestMultiplier > 0 ? `${bestMultiplier.toFixed(2)}x` : '—', color: '#fbbf24' },
          { label: 'Профит', value: sessionProfit >= 0 ? `+${sessionProfit.toFixed(0)}` : sessionProfit.toFixed(0), color: profitColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: color || '#f8fafc' }}>{value}</div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Распределение
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { label: '< 2x', count: history.filter(m => m < 2).length, color: '#ef4444' },
              { label: '2x – 5x', count: history.filter(m => m >= 2 && m < 5).length, color: '#fbbf24' },
              { label: '> 5x', count: history.filter(m => m >= 5).length, color: '#22c55e' },
            ].map(({ label, count, color }) => {
              const pct = history.length > 0 ? (count / history.length) * 100 : 0;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{ color, width: '52px', fontWeight: 'bold', flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ color: 'var(--text-secondary)', width: '24px', textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
