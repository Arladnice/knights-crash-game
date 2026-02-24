"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    PORT: process.env.PORT || 3001,
    INITIAL_BALANCE: 10000,
    MS_PER_TICK: 100,
    WAITING_TIME_MS: 10000,
    HISTORY_SIZE: 20,
};
