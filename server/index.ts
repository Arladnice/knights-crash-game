import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

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

let currentPhase: GamePhase = GamePhase.WAITING;
let currentMultiplier = 1.0;
let crashPoint = 1.0;
let activePlayers: Record<string, PlayerInfo> = {};

const MS_PER_TICK = 100; 
const WAITING_TIME_MS = 5000;

function generateCrashPoint(): number {
  const e = 100 / (100 - Math.random() * 99); 
  return Math.max(1.0, Math.floor(e * 100) / 100);
}

function startGameLoop() {
  if (currentPhase !== GamePhase.WAITING) return;
  startWaiting();
}

function startWaiting() {
  currentPhase = GamePhase.WAITING;
  activePlayers = {};
  currentMultiplier = 1.0;
  
  io.emit('game:phase_changed', { phase: currentPhase, timeToStart: WAITING_TIME_MS });

  setTimeout(() => {
    startRunning();
  }, WAITING_TIME_MS);
}

function startRunning() {
  currentPhase = GamePhase.RUNNING;
  crashPoint = generateCrashPoint();
  currentMultiplier = 1.0;
  console.log(`New round started. Crash point: ${crashPoint}`);
  io.emit('game:phase_changed', { phase: currentPhase });

  let startTime = Date.now();

  const interval = setInterval(() => {
    const timeElapsed = Date.now() - startTime; 
    // Exponential growth
    currentMultiplier = Math.exp(0.00006 * timeElapsed); 
    const displayMultiplier = Math.floor(currentMultiplier * 100) / 100;

    if (displayMultiplier >= crashPoint) {
      clearInterval(interval);
      startCrashed(crashPoint);
    } else {
      io.emit('game:tick', { multiplier: displayMultiplier });
    }
  }, MS_PER_TICK);
}

function startCrashed(finalMultiplier: number) {
  currentPhase = GamePhase.CRASHED;
  io.emit('game:crashed', { multiplier: finalMultiplier });
  console.log(`Round ended. Crash point reached: ${finalMultiplier}`);
  
  setTimeout(() => {
    startWaiting();
  }, 3000);
}

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit('game:init', {
    phase: currentPhase,
    multiplier: currentPhase === GamePhase.RUNNING ? Math.floor(currentMultiplier * 100) / 100 : 1.0,
    players: Object.values(activePlayers)
  });

  socket.on('player:bet', (data: { amount: number }) => {
    if (currentPhase === GamePhase.WAITING) {
      activePlayers[socket.id] = {
        id: socket.id,
        name: `User${socket.id.substring(0,4)}`,
        betAmount: data.amount,
        cashedOut: false
      };
      io.emit('game:players', Object.values(activePlayers));
    }
  });

  socket.on('player:cashout', () => {
    if (currentPhase === GamePhase.RUNNING) {
      const player = activePlayers[socket.id];
      if (player && !player.cashedOut) {
        player.cashedOut = true;
        const currentM = Math.floor(currentMultiplier * 100) / 100;
        player.cashOutMultiplier = currentM;
        io.emit('game:players', Object.values(activePlayers));
        socket.emit('player:cashed_out_success', { multiplier: currentM, amount: player.betAmount * currentM });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (activePlayers[socket.id]) {
      delete activePlayers[socket.id];
      io.emit('game:players', Object.values(activePlayers));
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  startGameLoop();
});