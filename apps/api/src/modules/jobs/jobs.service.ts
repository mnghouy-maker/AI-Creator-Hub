/**
 * Job orchestration — the API side of Architecture §5.1. Turns "user asked for
 * expensive work" into a reserved, queued, trackable Job:
 *
 *   reserve credits (hold) → create Job row → link hold to job → enqueue
 *
 * If the queue can't accept the job we release the hold and mark it failed, so a
 * user is never charged for work that never started. The worker later CAPTURES
 * the hold on success or RELEASES it on failure.
 */
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { releaseHold } from '@hub/db';
import type { QueueName } from '@hub/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { QueueService } from '../../common/queue/queue.service.js';
import { CreditsService } from '../credits/credits.service.js';

interface CreateJobInput {
  orgId: string;
  userId: string;
  projectId?: string;
  queue: QueueName;
  action: string; // BillableAction key
  estimatedCredits: number;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly credits: CreditsService,
  ) {}

  async createAndEnqueue(input: CreateJobInput) {
    // 1. Reserve credits first — throws InsufficientCreditsError (→ 402) if short.
    const { holdId } = await this.credits.reserve(input.orgId, input.estimatedCredits);

    // 2. Create the Job row (QUEUED) and link the hold to it.
    const job = await this.prisma.client.job.create({
      data: {
        orgId: input.orgId,
        projectId: input.projectId,
        createdById: input.userId,
        queue: input.queue,
        action: input.action,
        status: 'QUEUED',
        idempotencyKey: randomUUID(),
      },
    });
    await this.prisma.client.creditHold.update({
      where: { id: holdId },
      data: { jobId: job.id },
    });

    // 3. Enqueue. If this fails, unwind so no credits stay locked.
    try {
      await this.queue.enqueue(input.queue, job.id);
    } catch (err) {
      await releaseHold(this.prisma.client, holdId);
      await this.prisma.client.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: 'Failed to enqueue job' },
      });
      throw err;
    }
    return job;
  }

  async getJob(orgId: string, jobId: string) {
    return this.prisma.client.job.findFirst({
      where: { id: jobId, orgId },
      select: {
        id: true,
        status: true,
        progress: true,
        stage: true,
        action: true,
        creditsCharged: true,
        error: true,
        projectId: true,
        createdAt: true,
        finishedAt: true,
      },
    });
  }

  async listJobs(orgId: string, take = 20) {
    return this.prisma.client.job.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        progress: true,
        action: true,
        projectId: true,
        createdAt: true,
      },
    });
  }
}
