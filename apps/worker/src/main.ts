/**
 * Worker entrypoint.
 *
 * Phase 2 scaffold: registers the BullMQ Workers for each queue and proves the
 * process boots and connects to Redis. The real processors (video pipeline,
 * TTS, text generation) — including the hold→debit/refund credit settlement
 * from Architecture §5.1 — are implemented in Phase 6.
 */
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES } from './queues.js';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  // Required by BullMQ for blocking commands.
  maxRetriesPerRequest: null,
});

// One Worker per queue. Concurrency is intentionally conservative here and will
// be driven by plan entitlements + provider limits in Phase 6.
const workers = Object.values(QUEUES).map(
  (queueName) =>
    new Worker(
      queueName,
      async (job) => {
        // Placeholder processor — replaced per-queue in Phase 6.
        // eslint-disable-next-line no-console
        console.log(`[worker:${queueName}] received job ${job.id} (${job.name})`);
        return { ok: true };
      },
      { connection, concurrency: 2 },
    ),
);

// eslint-disable-next-line no-console
console.log(`[worker] started, listening on queues: ${Object.values(QUEUES).join(', ')}`);

// Graceful shutdown so in-flight jobs finish before the process exits.
async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
