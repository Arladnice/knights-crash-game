import { PlayerInfo } from '../../shared/types';
import { config } from '../config';

class PlayerManager {
  private activePlayers: Record<string, PlayerInfo> = {};
  private userBalances: Record<string, number> = {};
  private roundHistory: number[] = [];

  initializePlayer(socketId: string) {
    if (!this.userBalances[socketId]) {
      this.userBalances[socketId] = config.INITIAL_BALANCE;
    }
  }

  getBalance(socketId: string) {
    return this.userBalances[socketId] || 0;
  }

  placeBet(socketId: string, amount: number): boolean {
    const balance = this.getBalance(socketId);
    if (balance < amount) return false;

    this.userBalances[socketId] -= amount;
    this.activePlayers[socketId] = {
      id: socketId,
      name: `User${socketId.substring(0, 4)}`,
      betAmount: amount,
      cashedOut: false,
    };
    return true;
  }

  cashOut(socketId: string, multiplier: number): { amount: number, player: PlayerInfo } | null {
    const player = this.activePlayers[socketId];
    if (player && !player.cashedOut) {
      player.cashedOut = true;
      const currentM = Math.floor(multiplier * 100) / 100;
      player.cashOutMultiplier = currentM;
      
      const winAmount = player.betAmount * currentM;
      this.userBalances[socketId] += winAmount;
      return { amount: winAmount, player };
    }
    return null;
  }

  getActivePlayers() {
    return Object.values(this.activePlayers);
  }

  clearActivePlayers() {
    this.activePlayers = {};
  }

  addRoundHistory(multiplier: number) {
    this.roundHistory.push(multiplier);
    if (this.roundHistory.length > config.HISTORY_SIZE) {
      this.roundHistory.shift();
    }
  }

  getRoundHistory() {
    return this.roundHistory;
  }
}

export const playerManager = new PlayerManager();
