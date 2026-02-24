"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerManager = void 0;
const config_1 = require("../config");
class PlayerManager {
    activePlayers = {};
    userBalances = {};
    roundHistory = [];
    initializePlayer(socketId) {
        if (!this.userBalances[socketId]) {
            this.userBalances[socketId] = config_1.config.INITIAL_BALANCE;
        }
    }
    getBalance(socketId) {
        return this.userBalances[socketId] || 0;
    }
    placeBet(socketId, amount) {
        const balance = this.getBalance(socketId);
        if (balance < amount)
            return false;
        this.userBalances[socketId] -= amount;
        this.activePlayers[socketId] = {
            id: socketId,
            name: `User${socketId.substring(0, 4)}`,
            betAmount: amount,
            cashedOut: false,
        };
        return true;
    }
    cashOut(socketId, multiplier) {
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
    addRoundHistory(multiplier) {
        this.roundHistory.push(multiplier);
        if (this.roundHistory.length > config_1.config.HISTORY_SIZE) {
            this.roundHistory.shift();
        }
    }
    getRoundHistory() {
        return this.roundHistory;
    }
}
exports.playerManager = new PlayerManager();
