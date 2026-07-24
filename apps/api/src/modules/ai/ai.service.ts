/**
 * AI text tools — the producer side. Each request becomes a Project (so it lands
 * in the library) plus a queued Job that reserves credits up front. The actual
 * generation happens in the worker; this service never calls an LLM directly
 * (Architecture: the API produces, the worker consumes).
 */
import { Injectable } from '@nestjs/common';
import { estimateCredits, QUEUES, type BillableAction } from '@hub/shared';
import type { ProjectType } from '@hub/db';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import type { TextTool, GenerateDto } from './ai.dto.js';

// Each tool maps to a billable action (cost) + a Prisma ProjectType (library
// icon/filter). Prisma enums are UPPER_SNAKE, the shared cost keys are lowercase.
const TOOL_MAP: Record<
  TextTool,
  { action: BillableAction; projectType: ProjectType; label: string }
> = {
  script: { action: 'script', projectType: 'SCRIPT', label: 'Script' },
  blog: { action: 'blog', projectType: 'BLOG', label: 'Blog post' },
  social: { action: 'social_caption', projectType: 'SOCIAL', label: 'Social caption' },
  title: { action: 'title', projectType: 'SOCIAL', label: 'Titles' },
  hashtags: { action: 'hashtags', projectType: 'SOCIAL', label: 'Hashtags' },
};

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async generate(tool: TextTool, orgId: string, userId: string, dto: GenerateDto) {
    const { action, projectType, label } = TOOL_MAP[tool];
    const estimated = estimateCredits({ action });

    // The project holds the request now and the generated result later.
    const project = await this.prisma.client.project.create({
      data: {
        orgId,
        createdById: userId,
        type: projectType,
        title: `${label}: ${dto.prompt.slice(0, 60)}`,
        metadata: { tool, input: dto },
      },
    });

    const job = await this.jobs.createAndEnqueue({
      orgId,
      userId,
      projectId: project.id,
      queue: QUEUES.aiText,
      action,
      estimatedCredits: estimated,
    });

    return { jobId: job.id, projectId: project.id, estimatedCredits: estimated };
  }
}
