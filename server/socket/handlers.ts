import { Socket, Server } from 'socket.io';
import { GamePhase } from '../../shared/types';
import { playerManager } from '../game/PlayerManager';
import { GameEngine } from '../game/GameEngine';

export function setupSocketHandlers(io: Server, engine: GameEngine) {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    playerManager.initializePlayer(socket.id);

    const currentMultiplier = engine.currentPhase === GamePhase.RUNNING 
      ? Math.floor(engine.currentMultiplier * 100) / 100 
      : 1.0;

    socket.emit('game:init', {
      phase: engine.currentPhase,
      multiplier: currentMultiplier,
      players: playerManager.getActivePlayers()
    });
    
    socket.emit('player:balance', { balance: playerManager.getBalance(socket.id) });
    socket.emit('game:history', playerManager.getRoundHistory());

    socket.on('player:bet', (data: { amount: number }) => {
      if (engine.currentPhase === GamePhase.WAITING) {
        const success = playerManager.placeBet(socket.id, data.amount);
        if (!success) {
          socket.emit('player:error', { message: 'Insufficient balance' });
          return;
        }

        socket.emit('player:balance', { balance: playerManager.getBalance(socket.id) });
        io.emit('game:players', playerManager.getActivePlayers());
      }
    });

    socket.on('player:cashout', () => {
      if (engine.currentPhase === GamePhase.RUNNING) {
        const result = playerManager.cashOut(socket.id, engine.currentMultiplier);
        if (result) {
          socket.emit('player:balance', { balance: playerManager.getBalance(socket.id) });
          io.emit('game:players', playerManager.getActivePlayers());
          socket.emit('player:cashed_out_success', { 
            multiplier: result.player.cashOutMultiplier, 
            amount: result.amount 
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}
