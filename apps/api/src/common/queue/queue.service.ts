/**
 * Queue producer. Holds one BullMQ Queue per work type and exposes `enqueue`.
 * The API only ever PRODUCES jobs here; the worker consumes them. Job data is
 * just the DB jobId (the worker loads the rest), and we set an idempotency key
 * so a retried enqueue can't create a duplicate run (Architecture §2).
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES, type QueueName } from '@hub/shared';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues = new Map<QueueName, Queue>();

  constructor(config: ConfigService) {
    this.connection = new IORedis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    for (const name of Object.values(QUEUES)) {
      this.queues.set(name, new Queue(name, { connection: this.connection }));
    }
  }

  async enqueue(queue: QueueName, jobId: string): Promise<void> {
    const q = this.queues.get(queue);
    if (!q) throw new Error(`Unknown queue: ${queue}`);
    await q.add(
      queue,
      { jobId },
      {
        jobId, // dedupe: one BullMQ job per DB job id
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  async onModuleDestroy() {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await this.connection.quit();
  }
}
