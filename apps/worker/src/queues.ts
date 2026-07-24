/**
 * Queue definitions shared by producers (API) and consumers (this worker).
 *
 * Splitting work across named queues (not one firehose) lets us bound
 * concurrency per work type — a flood of video encodes degrades into a longer
 * video queue instead of blocking cheap text jobs (Architecture §7 backpressure).
 */
export const QUEUES = {
  aiText: 'ai-text', // scripts, blogs, captions, titles, hashtags
  video: 'video-translate', // the heavy ffmpeg + STT + MT + TTS pipeline
  voice: 'voice-tts', // standalone voiceovers
  image: 'image-gen', // image generation
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Redis connection settings for BullMQ. Single source so producers/consumers agree. */
export const redisConnection = {
  // BullMQ accepts a connection URL via ioredis options; the worker/API both
  // read REDIS_URL from the environment.
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
};
