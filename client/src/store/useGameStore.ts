import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export enum GamePhase {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  CRASHED = 'CRASHED',
}

export interface PlayerInfo {
  id: string;
  name: string;
  betAmount: number;
  cashedOut: boolean;
  cashOutMultiplier?: number;
}

interface GameState {
  socket: Socket | null;
  isConnected: boolean;
  phase: GamePhase;
  multiplier: number;
  players: PlayerInfo[];
  timeToStart: number;
  myBetAmount: number;
  hasBet: boolean;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  placeBet: (amount: number) => void;
  cashOut: () => void;
}

const SOCKET_URL = 'http://localhost:3001';

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  isConnected: false,
  phase: GamePhase.WAITING,
  multiplier: 1.0,
  players: [],
  timeToStart: 0,
  myBetAmount: 0,
  hasBet: false,

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

    socket.on('game:tick', (data: { multiplier: number }) => {
      set({ multiplier: data.multiplier });
    });

    socket.on('game:crashed', (data: { multiplier: number }) => {
      set({ phase: GamePhase.CRASHED, multiplier: data.multiplier });
    });

    socket.on('game:players', (players: PlayerInfo[]) => {
      set({ players });
    });

    socket.on('player:cashed_out_success', (data: { multiplier: number; amount: number }) => {
      console.log('Cashed out!', data);
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
