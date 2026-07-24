/**
 * Job status API. `GET /jobs` and `GET /jobs/:id` are simple reads; `GET
 * /jobs/:id/stream` is Server-Sent Events so the dashboard progress bars update
 * live without polling (Architecture §7 streaming). The stream ends itself once
 * the job reaches a terminal state.
 */
import { Controller, Get, MessageEvent, NotFoundException, Param, Sse } from '@nestjs/common';
import { Observable, interval, from, switchMap, map, takeWhile } from 'rxjs';
import { JobsService } from './jobs.service.js';
import { OrgService } from '../../common/org/org.service.js';
import { CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';

const TERMINAL = ['COMPLETED', 'FAILED', 'CANCELED'];

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly org: OrgService,
  ) {}

  @Get()
  async list(@CurrentUser() user: Principal) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return { jobs: await this.jobs.listJobs(orgId) };
  }

  @Get(':id')
  async get(@CurrentUser() user: Principal, @Param('id') id: string) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    const job = await this.jobs.getJob(orgId, id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  @Sse(':id/stream')
  async stream(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    // Poll the Job row once a second and push it as an SSE event, stopping the
    // stream when the job finishes. Simple, robust, and horizontally scalable.
    return interval(1000).pipe(
      switchMap(() => from(this.jobs.getJob(orgId, id))),
      takeWhile((job) => !!job && !TERMINAL.includes(job.status), true),
      map((job) => ({ data: job }) as MessageEvent),
    );
  }
}
