"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const types_1 = require("../../shared/types");
const PlayerManager_1 = require("../game/PlayerManager");
function setupSocketHandlers(io, engine) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        PlayerManager_1.playerManager.initializePlayer(socket.id);
        const currentMultiplier = engine.currentPhase === types_1.GamePhase.RUNNING
            ? Math.floor(engine.currentMultiplier * 100) / 100
            : 1.0;
        socket.emit('game:init', {
            phase: engine.currentPhase,
            multiplier: currentMultiplier,
            players: PlayerManager_1.playerManager.getActivePlayers()
        });
        socket.emit('player:balance', { balance: PlayerManager_1.playerManager.getBalance(socket.id) });
        socket.emit('game:history', PlayerManager_1.playerManager.getRoundHistory());
        socket.on('player:bet', (data) => {
            if (engine.currentPhase === types_1.GamePhase.WAITING) {
                const success = PlayerManager_1.playerManager.placeBet(socket.id, data.amount);
                if (!success) {
                    socket.emit('player:error', { message: 'Insufficient balance' });
                    return;
                }
                socket.emit('player:balance', { balance: PlayerManager_1.playerManager.getBalance(socket.id) });
                io.emit('game:players', PlayerManager_1.playerManager.getActivePlayers());
            }
        });
        socket.on('player:cashout', () => {
            if (engine.currentPhase === types_1.GamePhase.RUNNING) {
                const result = PlayerManager_1.playerManager.cashOut(socket.id, engine.currentMultiplier);
                if (result) {
                    socket.emit('player:balance', { balance: PlayerManager_1.playerManager.getBalance(socket.id) });
                    io.emit('game:players', PlayerManager_1.playerManager.getActivePlayers());
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
