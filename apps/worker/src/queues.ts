/**
 * Redis connection for BullMQ workers. Queue NAMES live in @hub/shared (shared
 * with the API producer); this file only owns the worker's connection config.
 */
export const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
