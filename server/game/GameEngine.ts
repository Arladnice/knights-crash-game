import { Server } from 'socket.io';
import { GamePhase } from '../../shared/types';
import { config } from '../config';
import { playerManager } from './PlayerManager';

export class GameEngine {
  private io: Server;
  public currentPhase: GamePhase = GamePhase.WAITING;
  public currentMultiplier = 1.0;
  public crashPoint = 1.0;
  
  private waitingInterval: NodeJS.Timeout | null = null;
  private runningInterval: NodeJS.Timeout | null = null;
  
  constructor(io: Server) {
    this.io = io;
  }

  public start() {
    this.startWaiting();
  }

  private generateCrashPoint(): number {
    const e = 100 / (100 - Math.random() * 99); 
    return Math.max(1.0, Math.floor(e * 100) / 100);
  }

  private startWaiting() {
    this.currentPhase = GamePhase.WAITING;
    this.currentMultiplier = 1.0;
    playerManager.clearActivePlayers();
    
    this.io.emit('game:phase_changed', { phase: this.currentPhase, timeToStart: config.WAITING_TIME_MS });

    let timeLeft = config.WAITING_TIME_MS;
    
    if (this.waitingInterval) clearInterval(this.waitingInterval);
    
    this.waitingInterval = setInterval(() => {
      timeLeft -= config.MS_PER_TICK;
      if (timeLeft <= 0) {
        clearInterval(this.waitingInterval!);
        this.startRunning();
      } else {
        this.io.emit('game:wait_tick', { timeLeft });
      }
    }, config.MS_PER_TICK);
  }

  private startRunning() {
    this.currentPhase = GamePhase.RUNNING;
    this.crashPoint = this.generateCrashPoint();
    this.currentMultiplier = 1.0;
    console.log(`New round started. Crash point: ${this.crashPoint}`);
    
    this.io.emit('game:phase_changed', { phase: this.currentPhase });

    const startTime = Date.now();

    if (this.runningInterval) clearInterval(this.runningInterval);

    this.runningInterval = setInterval(() => {
      const timeElapsed = Date.now() - startTime; 
      // Exponential growth curve
      this.currentMultiplier = Math.exp(0.00006 * timeElapsed); 
      const displayMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

      if (displayMultiplier >= this.crashPoint) {
        clearInterval(this.runningInterval!);
        this.startCrashed(this.crashPoint);
      } else {
        this.io.emit('game:tick', { multiplier: displayMultiplier });
      }
    }, config.MS_PER_TICK);
  }

  private startCrashed(finalMultiplier: number) {
    this.currentPhase = GamePhase.CRASHED;
    
    playerManager.addRoundHistory(finalMultiplier);
    this.io.emit('game:history', playerManager.getRoundHistory());

    this.io.emit('game:crashed', { multiplier: finalMultiplier });
    console.log(`Round ended. Crash point reached: ${finalMultiplier}`);
    
    setTimeout(() => {
      this.startWaiting();
    }, 3000); // Wait 3s before restarting
  }
}
