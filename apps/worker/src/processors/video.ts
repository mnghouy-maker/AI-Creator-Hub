/**
 * Video translation pipeline (Architecture §5.2). Runs the five stages and
 * reports each via the Job's `stage` + `progress` so the dashboard shows a real
 * progress bar (not a spinner):
 *
 *   EXTRACT → TRANSCRIBE → TRANSLATE → VOICE → MERGE
 *
 * Cost is estimated up front from client-reported duration but CAPTURED from the
 * true transcript duration here — the estimate-vs-final settlement in action.
 * On any failure the hold is RELEASED so the user isn't charged.
 */
import { prisma, captureHoldByJob, releaseHoldByJob, type VideoStage } from '@hub/db';
import { estimateCredits, type LanguageCode } from '@hub/shared';
import type { Providers } from '@hub/providers';

async function setStage(jobId: string, stage: VideoStage, progress: number) {
  await prisma.job.update({ where: { id: jobId }, data: { stage, progress } });
}

/** Build a .srt subtitle body from timed segments. */
function toSrt(segments: { start: number; end: number; text: string }[]): string {
  const ts = (s: number) => {
    const d = new Date(s * 1000).toISOString().substring(11, 23).replace('.', ',');
    return d;
  };
  return segments
    .map((seg, i) => `${i + 1}\n${ts(seg.start)} --> ${ts(seg.end)}\n${seg.text}\n`)
    .join('\n');
}

export async function processVideoTranslate(jobId: string, providers: Providers): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { project: { include: { video: { include: { translations: true } } } } },
  });
  if (!job || !job.project?.video) return;

  const video = job.project.video;
  const translation = video.translations[0];
  const meta = (job.project.metadata ?? {}) as { targetLanguage?: string; voiceId?: string };
  const target = (meta.targetLanguage ?? 'en') as LanguageCode;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date(), stage: 'EXTRACT', progress: 8 },
  });

  try {
    const orgId = job.orgId;
    const sourceKey = video.sourceAssetId
      ? (await prisma.asset.findUnique({ where: { id: video.sourceAssetId } }))?.s3Key
      : undefined;

    // 1. EXTRACT audio (ffmpeg in the real impl; mock passes the key through).
    await setStage(jobId, 'EXTRACT', 12);
    const audioKey = sourceKey ?? `uploads/${orgId}/unknown`;

    // 2. TRANSCRIBE with timestamps.
    await setStage(jobId, 'TRANSCRIBE', 32);
    const stt = await providers.stt.transcribe({
      audioKey,
      language: video.sourceLanguage as LanguageCode | undefined,
    });

    // 3. TRANSLATE each segment into the target language (LLM).
    await setStage(jobId, 'TRANSLATE', 55);
    const translated = await Promise.all(
      stt.segments.map(async (seg) => {
        const { text } = await providers.llm.generateText({
          system: `Translate the text into language code "${target}". Return only the translation.`,
          prompt: seg.text,
        });
        return { ...seg, text: text.trim() };
      }),
    );

    // Subtitles → stored as an asset.
    const srt = toSrt(translated);
    const subtitleKey = `generated/subs/${jobId}-${target}.srt`;
    await providers.storage.putObject(subtitleKey, srt, 'application/x-subrip');
    const subtitleAsset = await prisma.asset.create({
      data: { orgId, kind: 'SUBTITLE', s3Key: subtitleKey, mimeType: 'application/x-subrip' },
    });

    // 4. VOICE — synthesize dubbed audio for the translated transcript.
    await setStage(jobId, 'VOICE', 75);
    const tts = await providers.tts.synthesize({
      text: translated.map((s) => s.text).join(' '),
      voiceId: meta.voiceId ?? 'aria',
      language: target,
    });
    const audioAsset = await prisma.asset.create({
      data: {
        orgId,
        kind: 'AUDIO',
        s3Key: tts.audioKey,
        mimeType: 'audio/mpeg',
        durationSeconds: tts.durationSeconds,
      },
    });

    // 5. MERGE dubbed audio + subtitles back into the video (ffmpeg mux).
    await setStage(jobId, 'MERGE', 92);
    const renderedKey = `generated/video/${jobId}-${target}.mp4`;
    await providers.storage.putObject(renderedKey, `MOCK_RENDERED_VIDEO(${target})`, 'video/mp4');
    const renderedAsset = await prisma.asset.create({
      data: {
        orgId,
        kind: 'RENDERED_VIDEO',
        s3Key: renderedKey,
        mimeType: 'video/mp4',
        durationSeconds: Math.round(stt.durationSeconds),
      },
    });

    if (translation) {
      await prisma.translation.update({
        where: { id: translation.id },
        data: {
          status: 'COMPLETED',
          subtitleAssetId: subtitleAsset.id,
          dubbedAudioAssetId: audioAsset.id,
          renderedVideoAssetId: renderedAsset.id,
        },
      });
    }

    // Final cost from the TRUE duration, then capture the hold.
    const finalCost = estimateCredits({
      action: 'video_translate',
      durationSeconds: stt.durationSeconds,
    });
    await captureHoldByJob(prisma, jobId, finalCost, `Video translation → ${target}`);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        finishedAt: new Date(),
        creditsCharged: finalCost,
        providerMeta: {
          stt: providers.stt.name,
          tts: providers.tts.name,
          durationSeconds: stt.durationSeconds,
        },
      },
    });
  } catch (err) {
    await releaseHoldByJob(prisma, jobId);
    if (translation) {
      await prisma.translation.update({
        where: { id: translation.id },
        data: { status: 'FAILED' },
      });
    }
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: String(err), finishedAt: new Date() },
    });
    throw err;
  }
}
