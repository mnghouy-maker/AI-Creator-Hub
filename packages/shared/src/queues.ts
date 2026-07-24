/**
 * Queue names + job payload contracts — shared so the API (producer) and worker
 * (consumer) can never disagree on a queue name or the shape of a job's data.
 * Splitting work across named queues lets us bound concurrency per work type so
 * a burst of video encodes can't starve cheap text jobs (Architecture §7).
 */
export const QUEUES = {
  aiText: 'ai-text',
  video: 'video-translate',
  voice: 'voice-tts',
  image: 'image-gen',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Every enqueued job carries only its DB `jobId`; the worker loads the full Job
 * row (and its project/payload) from Postgres. Keeping the queue payload tiny
 * avoids drift between the queue message and the source of truth.
 */
export interface JobPayload {
  jobId: string;
}
