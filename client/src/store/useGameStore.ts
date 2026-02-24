import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GamePhase } from '@shared/types';
import type { PlayerInfo } from '@shared/types';
export { GamePhase } from '@shared/types';
export type { PlayerInfo } from '@shared/types';


interface GameState {
  socket: Socket | null;
  isConnected: boolean;
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
  placeBet: (amount: number) => void;
  cashOut: () => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  isConnected: false,
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
    if (get().socket) return;
    const socket = io(SOCKET_URL);

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    socket.on('game:init', (data: { phase: GamePhase; multiplier: number; players: PlayerInfo[] }) => {
      set({ 
        phase: data.phase, 
        multiplier: data.multiplier,
        players: data.players || []
      });
    });

    socket.on('game:phase_changed', (data: { phase: GamePhase; timeToStart?: number }) => {
      set({ phase: data.phase, timeToStart: data.timeToStart || 0 });
      if (data.phase === GamePhase.WAITING) {
        set({ hasBet: false, myBetAmount: 0 }); // Reset for next round
      }
    });

    socket.on('game:wait_tick', (data: { timeLeft: number }) => {
      set({ timeToStart: data.timeLeft });
    });

    socket.on('game:tick', (data: { multiplier: number }) => {
      set({ multiplier: data.multiplier });
      // Auto-cashout check
      const { autoCashoutEnabled, autoCashoutAt, hasBet, phase } = get();
      const me = get().players.find(p => p.id === get().socket?.id);
      if (autoCashoutEnabled && hasBet && phase === GamePhase.RUNNING && !me?.cashedOut && data.multiplier >= autoCashoutAt) {
        get().cashOut();
      }
    });

    socket.on('game:crashed', (data: { multiplier: number }) => {
      const { hasBet, myBetAmount } = get();
      set({ phase: GamePhase.CRASHED, multiplier: data.multiplier });
      // Track loss if player had a bet and didn't cash out
      const me = get().players.find(p => p.id === get().socket?.id);
      if (hasBet && !me?.cashedOut) {
        set(s => ({ 
          sessionBets: s.sessionBets + 1,
          sessionLosses: s.sessionLosses + 1,
          sessionProfit: s.sessionProfit - myBetAmount
        }));
      }
    });

    socket.on('game:players', (players: PlayerInfo[]) => {
      set({ players });
    });

    socket.on('player:cashed_out_success', (data: { multiplier: number; amount: number }) => {
      const { myBetAmount, bestMultiplier } = get();
      set(s => ({
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

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  placeBet: (amount: number) => {
    const socket = get().socket;
    if (socket && get().phase === GamePhase.WAITING) {
      socket.emit('player:bet', { amount });
      set({ hasBet: true, myBetAmount: amount });
    }
  },

  cashOut: () => {
    const socket = get().socket;
    if (socket && get().phase === GamePhase.RUNNING) {
      socket.emit('player:cashout');
    }
  }
}));
