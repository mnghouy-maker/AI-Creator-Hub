/**
 * Image generation processor — thumbnails/post visuals. Fixed per-image cost.
 * Same settle-on-success / release-on-failure discipline as every other job.
 */
import { prisma, captureHoldByJob, releaseHoldByJob, type Prisma } from '@hub/db';
import { estimateCredits } from '@hub/shared';
import type { Providers } from '@hub/providers';

export async function processImage(jobId: string, providers: Providers): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { project: true } });
  if (!job || !job.project) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date(), progress: 30 },
  });

  try {
    const meta = (job.project.metadata ?? {}) as { input?: { prompt?: string } };
    const { imageKey } = await providers.image.generate({ prompt: meta.input?.prompt ?? '' });

    const asset = await prisma.asset.create({
      data: {
        orgId: job.orgId,
        projectId: job.projectId,
        kind: 'IMAGE',
        s3Key: imageKey,
        mimeType: 'image/png',
      },
    });
    await prisma.project.update({
      where: { id: job.projectId! },
      data: { metadata: { ...meta, result: { imageAssetId: asset.id } } as Prisma.InputJsonValue },
    });

    const finalCost = estimateCredits({ action: 'image', imageCount: 1 });
    await captureHoldByJob(prisma, jobId, finalCost, 'Image generation');

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        finishedAt: new Date(),
        creditsCharged: finalCost,
        providerMeta: { image: providers.image.name },
      },
    });
  } catch (err) {
    await releaseHoldByJob(prisma, jobId);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: String(err), finishedAt: new Date() },
    });
    throw err;
  }
}
