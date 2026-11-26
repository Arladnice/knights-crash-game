import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GamePhase } from '@shared/types';
import type { PlayerInfo } from '@shared/types';
export { GamePhase } from '@shared/types';
export type { PlayerInfo } from '@shared/types';

interface GameState {
  socket: Socket | null;
  isConnected: boolean;
  isDemoMode: boolean;
  myPlayerId: string | null;
  phase: GamePhase;
  multiplier: number;
  players: PlayerInfo[];
  timeToStart: number;
  myBetAmount: number;
  hasBet: boolean;
  balance: number;
  history: number[];
  // Session stats
  sessionBets: number;
  sessionWins: number;
  sessionLosses: number;
  sessionProfit: number;
  bestMultiplier: number;
  // Auto-cashout
  autoCashoutEnabled: boolean;
  autoCashoutAt: number;
  setAutoCashout: (enabled: boolean, at: number) => void;
  // Actions
  connect: () => void;
  disconnect: () => void;
  retryLive: () => void;
  placeBet: (amount: number) => void;
  cashOut: () => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
const DEMO_PLAYER_ID = 'demo-player';
const INITIAL_DEMO_BALANCE = 1000;

let demoTimer: ReturnType<typeof setInterval> | null = null;
let demoTimeout: ReturnType<typeof setTimeout> | null = null;
let liveFallbackTimeout: ReturnType<typeof setTimeout> | null = null;

function clearDemoTimers() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  if (demoTimeout) {
    clearTimeout(demoTimeout);
    demoTimeout = null;
  }
}

function generateCrashPoint(): number {
  const e = 100 / (100 - Math.random() * 99);
  return Math.max(1.05, Math.floor(e * 100) / 100);
}

function createBotPlayers(): Array<PlayerInfo & { targetMult: number }> {
  const names = ['Sir_Lancelot', 'DragonSlayer', 'CryptoKnight', 'Valerie_77'];
  return names.map((name, idx) => ({
    id: `bot-${idx}`,
    name,
    betAmount: [25, 50, 100, 200][idx % 4],
    cashedOut: false,
    targetMult: Number((1.3 + Math.random() * 3.5).toFixed(2)),
  }));
}

function toPublicPlayers(bots: Array<PlayerInfo & { targetMult: number }>): PlayerInfo[] {
  return bots.map(({ id, name, betAmount, cashedOut, cashOutMultiplier }) => ({
    id,
    name,
    betAmount,
    cashedOut,
    cashOutMultiplier,
  }));
}

export const useGameStore = create<GameState>((set, get) => {
  let demoBots: Array<PlayerInfo & { targetMult: number }> = [];
  let demoCrashPoint = 2.0;

  const startDemoWaiting = () => {
    clearDemoTimers();
    if (!get().isDemoMode) return;

    demoBots = createBotPlayers();
    let timeLeft = 5000;

    set({
      phase: GamePhase.WAITING,
      multiplier: 1.0,
      timeToStart: timeLeft,
      hasBet: false,
      myBetAmount: 0,
      players: toPublicPlayers(demoBots),
    });

    demoTimer = setInterval(() => {
      if (!get().isDemoMode) {
        clearDemoTimers();
        return;
      }
      timeLeft -= 100;
      if (timeLeft <= 0) {
        clearDemoTimers();
        startDemoRunning();
      } else {
        set({ timeToStart: timeLeft });
      }
    }, 100);
  };

  const startDemoRunning = () => {
    clearDemoTimers();
    if (!get().isDemoMode) return;

    demoCrashPoint = generateCrashPoint();
    const startTime = Date.now();
    set({ phase: GamePhase.RUNNING, multiplier: 1.0 });

    demoTimer = setInterval(() => {
      if (!get().isDemoMode) {
        clearDemoTimers();
        return;
      }
      const elapsed = Date.now() - startTime;
      const mult = Math.floor(Math.exp(0.00009 * elapsed) * 100) / 100;

      // Обновление ботов
      let botsUpdated = false;
      demoBots = demoBots.map((b) => {
        if (!b.cashedOut && mult >= b.targetMult && mult < demoCrashPoint) {
          botsUpdated = true;
          return { ...b, cashedOut: true, cashOutMultiplier: b.targetMult };
        }
        return b;
      });

      if (botsUpdated) {
        const me = get().players.find((p) => p.id === DEMO_PLAYER_ID);
        const list = toPublicPlayers(demoBots);
        set({ players: me ? [me, ...list] : list });
      }

      if (mult >= demoCrashPoint) {
        clearDemoTimers();
        const { hasBet, myBetAmount, players, history } = get();
        const me = players.find((p) => p.id === DEMO_PLAYER_ID);
        if (hasBet && !me?.cashedOut) {
          set((s) => ({
            sessionBets: s.sessionBets + 1,
            sessionLosses: s.sessionLosses + 1,
            sessionProfit: s.sessionProfit - myBetAmount,
          }));
        }
        set({
          phase: GamePhase.CRASHED,
          multiplier: demoCrashPoint,
          history: [...history.slice(-19), demoCrashPoint],
        });
        demoTimeout = setTimeout(startDemoWaiting, 2800);
        return;
      }

      set({ multiplier: mult });
      const { autoCashoutEnabled, autoCashoutAt, hasBet, players } = get();
      const me = players.find((p) => p.id === DEMO_PLAYER_ID);
      if (autoCashoutEnabled && hasBet && !me?.cashedOut && mult >= autoCashoutAt) {
        get().cashOut();
      }
    }, 50);
  };

  const enableDemoMode = () => {
    if (get().isDemoMode) return;
    const sock = get().socket;
    if (sock) {
      sock.disconnect();
    }
    set({
      socket: null,
      isConnected: false,
      isDemoMode: true,
      myPlayerId: DEMO_PLAYER_ID,
      balance: get().balance > 0 ? get().balance : INITIAL_DEMO_BALANCE,
      history: get().history.length > 0 ? get().history : [1.45, 3.12, 1.08, 6.4, 2.15],
    });
    startDemoWaiting();
  };

  return {
    socket: null,
    isConnected: false,
    isDemoMode: false,
    myPlayerId: null,
    phase: GamePhase.WAITING,
    multiplier: 1.0,
    players: [],
    timeToStart: 0,
    myBetAmount: 0,
    hasBet: false,
    balance: 0,
    history: [],
    sessionBets: 0,
    sessionWins: 0,
    sessionLosses: 0,
    sessionProfit: 0,
    bestMultiplier: 0,
    autoCashoutEnabled: false,
    autoCashoutAt: 2.0,

    setAutoCashout: (enabled, at) => set({ autoCashoutEnabled: enabled, autoCashoutAt: at }),

    connect: () => {
      if (get().socket || get().isDemoMode) return;

      if (!SOCKET_URL) {
        enableDemoMode();
        return;
      }

      const socket = io(SOCKET_URL, {
        reconnectionAttempts: 2,
        timeout: 2500,
      });

      if (liveFallbackTimeout) clearTimeout(liveFallbackTimeout);
      liveFallbackTimeout = setTimeout(() => {
        if (!get().isConnected) {
          enableDemoMode();
        }
      }, 2800);

      socket.on('connect', () => {
        if (liveFallbackTimeout) clearTimeout(liveFallbackTimeout);
        clearDemoTimers();
        set({
          isConnected: true,
          isDemoMode: false,
          myPlayerId: socket.id || null,
        });
      });

      socket.on('connect_error', () => {
        if (!get().isConnected) {
          enableDemoMode();
        }
      });

      socket.on('disconnect', () => set({ isConnected: false }));

      socket.on('game:init', (data: { phase: GamePhase; multiplier: number; players: PlayerInfo[] }) => {
        set({
          phase: data.phase,
          multiplier: data.multiplier,
          players: data.players || [],
        });
      });

      socket.on('game:phase_changed', (data: { phase: GamePhase; timeToStart?: number }) => {
        set({ phase: data.phase, timeToStart: data.timeToStart || 0 });
        if (data.phase === GamePhase.WAITING) {
          set({ hasBet: false, myBetAmount: 0 });
        }
      });

      socket.on('game:wait_tick', (data: { timeLeft: number }) => {
        set({ timeToStart: data.timeLeft });
      });

      socket.on('game:tick', (data: { multiplier: number }) => {
        set({ multiplier: data.multiplier });
        const { autoCashoutEnabled, autoCashoutAt, hasBet, phase, myPlayerId, players } = get();
        const me = players.find((p) => p.id === myPlayerId);
        if (autoCashoutEnabled && hasBet && phase === GamePhase.RUNNING && !me?.cashedOut && data.multiplier >= autoCashoutAt) {
          get().cashOut();
        }
      });

      socket.on('game:crashed', (data: { multiplier: number }) => {
        const { hasBet, myBetAmount, myPlayerId, players } = get();
        set({ phase: GamePhase.CRASHED, multiplier: data.multiplier });
        const me = players.find((p) => p.id === myPlayerId);
        if (hasBet && !me?.cashedOut) {
          set((s) => ({
            sessionBets: s.sessionBets + 1,
            sessionLosses: s.sessionLosses + 1,
            sessionProfit: s.sessionProfit - myBetAmount,
          }));
        }
      });

      socket.on('game:players', (players: PlayerInfo[]) => {
        set({ players });
      });

      socket.on('player:cashed_out_success', (data: { multiplier: number; amount: number }) => {
        const { myBetAmount, bestMultiplier } = get();
        set((s) => ({
          sessionBets: s.sessionBets + 1,
          sessionWins: s.sessionWins + 1,
          sessionProfit: s.sessionProfit + (data.amount - myBetAmount),
          bestMultiplier: Math.max(bestMultiplier, data.multiplier),
        }));
      });

      socket.on('player:balance', (data: { balance: number }) => {
        set({ balance: data.balance });
      });

      socket.on('game:history', (history: number[]) => {
        set({ history });
      });

      set({ socket });
    },

    retryLive: () => {
      clearDemoTimers();
      set({ isDemoMode: false });
      get().connect();
    },

    disconnect: () => {
      if (liveFallbackTimeout) clearTimeout(liveFallbackTimeout);
      clearDemoTimers();
      const socket = get().socket;
      if (socket) {
        socket.disconnect();
      }
      set({ socket: null, isConnected: false, isDemoMode: false });
    },

    placeBet: (amount: number) => {
      const { socket, isDemoMode, phase, balance, players } = get();
      if (phase !== GamePhase.WAITING || amount < 10 || amount > balance) return;

      if (isDemoMode) {
        const me: PlayerInfo = {
          id: DEMO_PLAYER_ID,
          name: 'Вы (Demo)',
          betAmount: amount,
          cashedOut: false,
        };
        set({
          hasBet: true,
          myBetAmount: amount,
          balance: Number((balance - amount).toFixed(2)),
          players: [me, ...players.filter((p) => p.id !== DEMO_PLAYER_ID)],
        });
        return;
      }

      if (socket) {
        socket.emit('player:bet', { amount });
        set({ hasBet: true, myBetAmount: amount });
      }
    },

    cashOut: () => {
      const { socket, isDemoMode, phase, hasBet, myBetAmount, multiplier, balance, players, bestMultiplier } = get();
      if (phase !== GamePhase.RUNNING || !hasBet) return;

      if (isDemoMode) {
        const me = players.find((p) => p.id === DEMO_PLAYER_ID);
        if (!me || me.cashedOut) return;
        const winAmount = Number((myBetAmount * multiplier).toFixed(2));
        set((s) => ({
          balance: Number((balance + winAmount).toFixed(2)),
          sessionBets: s.sessionBets + 1,
          sessionWins: s.sessionWins + 1,
          sessionProfit: s.sessionProfit + (winAmount - myBetAmount),
          bestMultiplier: Math.max(bestMultiplier, multiplier),
          players: players.map((p) =>
            p.id === DEMO_PLAYER_ID ? { ...p, cashedOut: true, cashOutMultiplier: multiplier } : p
          ),
        }));
        return;
      }

      if (socket) {
        socket.emit('player:cashout');
      }
    },
  };
});
