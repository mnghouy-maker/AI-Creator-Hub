/**
 * AI text processor. Loads the Job + its Project, builds the tool-specific
 * prompt, calls the LLM (mock by default), stores the result on the project, and
 * settles credits: CAPTURE on success (the real charge), RELEASE on failure (no
 * charge). This is the worker side of the hold→settle lifecycle.
 */
import { prisma, captureHoldByJob, releaseHoldByJob, type Prisma } from '@hub/db';
import { estimateCredits, type BillableAction } from '@hub/shared';
import type { Providers } from '@hub/providers';
import { buildPrompt } from '../prompts.js';

export async function processAiText(jobId: string, providers: Providers): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { project: true } });
  if (!job || !job.project) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date(), progress: 15 },
  });

  try {
    const meta = (job.project.metadata ?? {}) as { tool?: string; input?: Record<string, unknown> };
    const { system, prompt } = buildPrompt(meta.tool ?? 'script', (meta.input ?? {}) as never);

    const { text, usage } = await providers.llm.generateText({ system, prompt });

    await prisma.project.update({
      where: { id: job.projectId! },
      data: { metadata: { ...meta, result: text } as Prisma.InputJsonValue },
    });

    // Text tools are fixed per-generation cost; final == estimate.
    const finalCost = estimateCredits({ action: job.action as BillableAction });
    await captureHoldByJob(prisma, jobId, finalCost, `${meta.tool} generation`);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        finishedAt: new Date(),
        creditsCharged: finalCost,
        providerMeta: { provider: providers.llm.name, ...usage },
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
