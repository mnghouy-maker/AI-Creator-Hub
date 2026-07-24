/** Global module exposing the QueueService producer to any feature module. */
import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';

@Global()
@Module({ providers: [QueueService], exports: [QueueService] })
export class QueueModule {}
