/**
 * useJob — runs an AI job and tracks it to completion. Kicks off the generation,
 * then polls the job status until it reaches a terminal state, then fetches the
 * project result. Polling (vs the SSE endpoint) keeps the client trivially
 * robust to reconnects; the API supports both.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { aiApi, jobsApi, projectsApi, ApiError, type JobStatus } from '@/lib/api';

type ToolName = 'script' | 'blog' | 'social' | 'title' | 'hashtags';
type Phase = 'idle' | 'running' | 'done' | 'error';

export function useJob(tool: ToolName) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [job, setJob] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (input: { prompt: string; tone?: string; platform?: string; language?: string }) => {
      setPhase('running');
      setResult('');
      setError('');
      setJob(null);
      try {
        const { jobId, projectId } = await aiApi.generate(tool, input);

        const poll = async () => {
          const status = await jobsApi.get(jobId);
          setJob(status);
          if (status.status === 'COMPLETED') {
            const project = await projectsApi.get(projectId);
            setResult(project.metadata?.result ?? '');
            setPhase('done');
          } else if (status.status === 'FAILED' || status.status === 'CANCELED') {
            setError(status.error ?? 'Generation failed');
            setPhase('error');
          } else {
            timer.current = setTimeout(poll, 1000);
          }
        };
        await poll();
      } catch (err) {
        // 402 = out of credits; surface the precise message from the API.
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
        setPhase('error');
      }
    },
    [tool],
  );

  return { phase, job, result, error, run };
}
