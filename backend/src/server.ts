import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { createWorkers } from './mediasoup';
import { setupSockets } from './socket';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

async function run() {
  // Initialize mediasoup workers
  await createWorkers();

  // Setup socket connection
  setupSockets(io);

  server.listen(config.listenPort, () => {
    console.log(`Server listening on port ${config.listenPort}`);
  });
}

run().catch(console.error);
