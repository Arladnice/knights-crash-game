import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

import { config } from './config';
import { GameEngine } from './game/GameEngine';
import { setupSocketHandlers } from './socket/handlers';

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

const app = express();
app.use(cors({ origin: allowedOrigins }));

// Health-check endpoint for Render
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

const engine = new GameEngine(io);
setupSocketHandlers(io, engine);

engine.start();

httpServer.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});


