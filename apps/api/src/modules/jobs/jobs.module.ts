/** Jobs feature: create/enqueue orchestration + status/SSE. Exported so AI and
 *  video modules reuse createAndEnqueue. */
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';
import { CreditsModule } from '../credits/credits.module.js';

@Module({
  imports: [CreditsModule],
  providers: [JobsService],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
