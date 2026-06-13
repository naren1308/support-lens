import * as mediasoup from 'mediasoup';
import { types } from 'mediasoup';
import { config } from './config';

const workers: types.Worker[] = [];
let nextMediasoupWorkerIdx = 0;

export async function createWorkers() {
  const { numWorkers } = config.mediasoup;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.workerSettings.logLevel,
      logTags: config.mediasoup.workerSettings.logTags,
      rtcMinPort: config.mediasoup.workerSettings.rtcMinPort,
      rtcMaxPort: config.mediasoup.workerSettings.rtcMaxPort,
    });

    worker.on('died', () => {
      console.error(`mediasoup worker died, exiting in 2 seconds... [pid:${worker.pid}]`);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }

  console.log(`Created ${workers.length} mediasoup workers`);
}

export function getMediasoupWorker(): types.Worker {
  const worker = workers[nextMediasoupWorkerIdx];
  if (++nextMediasoupWorkerIdx === workers.length) {
    nextMediasoupWorkerIdx = 0;
  }
  return worker;
}

export async function createRoomRouter(): Promise<types.Router> {
  const worker = getMediasoupWorker();
  const router = await worker.createRouter({
    mediaCodecs: config.mediasoup.routerOptions.mediaCodecs,
  });
  return router;
}
