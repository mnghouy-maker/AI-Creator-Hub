/**
 * Video translation — producer side of the flagship pipeline (Architecture
 * §5.2). Two steps:
 *   1. upload-url: presign a direct browser→storage PUT (heavy bytes bypass the
 *      API) and record the Asset.
 *   2. translate: create Project→Video→Translation, reserve credits by duration,
 *      and enqueue the video job. The worker runs extract→transcribe→translate→
 *      voice→merge and captures the real cost.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { getProviders } from '@hub/providers';
import { estimateCredits, QUEUES } from '@hub/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import type { UploadUrlDto, TranslateDto } from './video.dto.js';

@Injectable()
export class VideoService {
  private readonly providers = getProviders();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  /** Presign an upload and register the pending source asset. */
  async createUploadUrl(orgId: string, dto: UploadUrlDto) {
    const key = `uploads/${orgId}/${Date.now()}-${dto.filename}`;
    const { url } = await this.providers.storage.getUploadUrl({
      key,
      contentType: dto.contentType,
    });
    const asset = await this.prisma.client.asset.create({
      data: { orgId, kind: 'SOURCE_VIDEO', s3Key: key, mimeType: dto.contentType },
    });
    return { uploadUrl: url, assetId: asset.id, key };
  }

  /** Create the project + video + translation and enqueue the pipeline job. */
  async translate(orgId: string, userId: string, dto: TranslateDto) {
    const asset = await this.prisma.client.asset.findFirst({
      where: { id: dto.assetId, orgId },
    });
    if (!asset) throw new NotFoundException('Uploaded video not found');

    const estimated = estimateCredits({
      action: 'video_translate',
      durationSeconds: dto.durationSeconds,
    });

    const project = await this.prisma.client.project.create({
      data: {
        orgId,
        createdById: userId,
        type: 'VIDEO_TRANSLATE',
        title: `Translation → ${dto.targetLanguage.toUpperCase()}`,
        metadata: { targetLanguage: dto.targetLanguage, voiceId: dto.voiceId },
        video: {
          create: {
            sourceAssetId: asset.id,
            sourceLanguage: dto.sourceLanguage,
            durationSeconds: dto.durationSeconds,
            translations: {
              create: {
                targetLanguage: dto.targetLanguage,
                voiceId: dto.voiceId,
                status: 'QUEUED',
              },
            },
          },
        },
      },
    });

    const job = await this.jobs.createAndEnqueue({
      orgId,
      userId,
      projectId: project.id,
      queue: QUEUES.video,
      action: 'video_translate',
      estimatedCredits: estimated,
    });

    return { jobId: job.id, projectId: project.id, estimatedCredits: estimated };
  }
}
