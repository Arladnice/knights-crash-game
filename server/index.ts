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

import { config } from './config';
import { GameEngine } from './game/GameEngine';
import { setupSocketHandlers } from './socket/handlers';

const engine = new GameEngine(io);
setupSocketHandlers(io, engine);

engine.start();

httpServer.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

