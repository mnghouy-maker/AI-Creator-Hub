/**
 * Voice Studio processor — standalone text-to-speech. Same hold→settle
 * lifecycle as the others; cost is per minute of GENERATED audio, computed from
 * the true synthesized duration.
 */
import { prisma, captureHoldByJob, releaseHoldByJob, type Prisma } from '@hub/db';
import { estimateCredits, type LanguageCode } from '@hub/shared';
import type { Providers } from '@hub/providers';

export async function processVoice(jobId: string, providers: Providers): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { project: true } });
  if (!job || !job.project) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date(), progress: 20 },
  });

  try {
    const meta = (job.project.metadata ?? {}) as {
      input?: { prompt?: string; language?: string };
      voiceId?: string;
    };
    const text = meta.input?.prompt ?? '';
    const tts = await providers.tts.synthesize({
      text,
      voiceId: meta.voiceId ?? 'aria',
      language: (meta.input?.language ?? 'en') as LanguageCode,
    });

    const asset = await prisma.asset.create({
      data: {
        orgId: job.orgId,
        projectId: job.projectId,
        kind: 'AUDIO',
        s3Key: tts.audioKey,
        mimeType: 'audio/mpeg',
        durationSeconds: tts.durationSeconds,
      },
    });

    await prisma.project.update({
      where: { id: job.projectId! },
      data: { metadata: { ...meta, result: { audioAssetId: asset.id } } as Prisma.InputJsonValue },
    });

    const finalCost = estimateCredits({
      action: 'voice_tts',
      durationSeconds: tts.durationSeconds,
    });
    await captureHoldByJob(prisma, jobId, finalCost, 'Voiceover');

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        finishedAt: new Date(),
        creditsCharged: finalCost,
        providerMeta: { tts: providers.tts.name, durationSeconds: tts.durationSeconds },
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
