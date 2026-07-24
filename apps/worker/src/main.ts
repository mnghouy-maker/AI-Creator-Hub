/**
 * Worker entrypoint. One BullMQ Worker per queue, each routed to its processor.
 * Concurrency is bounded per queue so a burst of video encodes can't starve
 * cheap text jobs (Architecture §7 backpressure). Every job's data is just the
 * DB jobId; the processor loads the rest and settles credits.
 *
 * Providers are resolved once (mock by default) and injected into each
 * processor, so swapping to real vendors later touches only the factory.
 */
import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { QUEUES, type JobPayload } from '@hub/shared';
import { getProviders } from '@hub/providers';
import { redisUrl } from './queues.js';
import { processAiText } from './processors/ai-text.js';
import { processVideoTranslate } from './processors/video.js';
import { processVoice } from './processors/voice.js';
import { processImage } from './processors/image.js';

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const providers = getProviders();

// Queue → processor + how many to run at once (video is heaviest → lowest).
const routes: { queue: string; concurrency: number; run: (jobId: string) => Promise<void> }[] = [
  { queue: QUEUES.aiText, concurrency: 5, run: (id) => processAiText(id, providers) },
  { queue: QUEUES.video, concurrency: 2, run: (id) => processVideoTranslate(id, providers) },
  { queue: QUEUES.voice, concurrency: 3, run: (id) => processVoice(id, providers) },
  { queue: QUEUES.image, concurrency: 3, run: (id) => processImage(id, providers) },
];

const workers = routes.map(
  (r) =>
    new Worker<JobPayload>(
      r.queue,
      async (job: Job<JobPayload>) => {
        await r.run(job.data.jobId);
      },
      { connection, concurrency: r.concurrency },
    ),
);

for (const w of workers) {
  w.on('failed', (job, err) => {
    console.error(`[worker:${w.name}] job ${job?.id} failed:`, err.message);
  });
}

console.log(`[worker] started on queues: ${routes.map((r) => r.queue).join(', ')}`);

async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
