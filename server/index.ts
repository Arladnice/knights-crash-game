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

// Self-ping to prevent Render sleep (runs every 10 minutes if URL is provided)
import http from 'http';
import https from 'https';

const selfPingUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL;
if (selfPingUrl) {
  const pingInterval = 10 * 60 * 1000; // 10 minutes
  console.log(`Self-ping configured for: ${selfPingUrl}`);
  setInterval(() => {
    try {
      const client = selfPingUrl.startsWith('https') ? https : http;
      client.get(`${selfPingUrl}/health`, (res) => {
        console.log(`Self-ping success. Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('Self-ping request error:', err.message);
      });
    } catch (error) {
      console.error('Self-ping unexpected error:', error);
    }
  }, pingInterval);
}



