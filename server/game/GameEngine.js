"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const types_1 = require("../../shared/types");
const config_1 = require("../config");
const PlayerManager_1 = require("./PlayerManager");
class GameEngine {
    io;
    currentPhase = types_1.GamePhase.WAITING;
    currentMultiplier = 1.0;
    crashPoint = 1.0;
    waitingInterval = null;
    runningInterval = null;
    constructor(io) {
        this.io = io;
    }
    start() {
        this.startWaiting();
    }
    generateCrashPoint() {
        const e = 100 / (100 - Math.random() * 99);
        return Math.max(1.0, Math.floor(e * 100) / 100);
    }
    startWaiting() {
        this.currentPhase = types_1.GamePhase.WAITING;
        this.currentMultiplier = 1.0;
        PlayerManager_1.playerManager.clearActivePlayers();
        this.io.emit('game:phase_changed', { phase: this.currentPhase, timeToStart: config_1.config.WAITING_TIME_MS });
        let timeLeft = config_1.config.WAITING_TIME_MS;
        if (this.waitingInterval)
            clearInterval(this.waitingInterval);
        this.waitingInterval = setInterval(() => {
            timeLeft -= config_1.config.MS_PER_TICK;
            if (timeLeft <= 0) {
                clearInterval(this.waitingInterval);
                this.startRunning();
            }
            else {
                this.io.emit('game:wait_tick', { timeLeft });
            }
        }, config_1.config.MS_PER_TICK);
    }
    startRunning() {
        this.currentPhase = types_1.GamePhase.RUNNING;
        this.crashPoint = this.generateCrashPoint();
        this.currentMultiplier = 1.0;
        console.log(`New round started. Crash point: ${this.crashPoint}`);
        this.io.emit('game:phase_changed', { phase: this.currentPhase });
        const startTime = Date.now();
        if (this.runningInterval)
            clearInterval(this.runningInterval);
        this.runningInterval = setInterval(() => {
            const timeElapsed = Date.now() - startTime;
            // Exponential growth curve
            this.currentMultiplier = Math.exp(0.00006 * timeElapsed);
            const displayMultiplier = Math.floor(this.currentMultiplier * 100) / 100;
            if (displayMultiplier >= this.crashPoint) {
                clearInterval(this.runningInterval);
                this.startCrashed(this.crashPoint);
            }
            else {
                this.io.emit('game:tick', { multiplier: displayMultiplier });
            }
        }, config_1.config.MS_PER_TICK);
    }
    startCrashed(finalMultiplier) {
        this.currentPhase = types_1.GamePhase.CRASHED;
        PlayerManager_1.playerManager.addRoundHistory(finalMultiplier);
        this.io.emit('game:history', PlayerManager_1.playerManager.getRoundHistory());
        this.io.emit('game:crashed', { multiplier: finalMultiplier });
        console.log(`Round ended. Crash point reached: ${finalMultiplier}`);
        setTimeout(() => {
            this.startWaiting();
        }, 3000); // Wait 3s before restarting
    }
}
exports.GameEngine = GameEngine;
