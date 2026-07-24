/** AI text tools feature. Depends on JobsModule for the reserve/enqueue flow. */
import { Module } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { JobsModule } from '../jobs/jobs.module.js';

@Module({
  imports: [JobsModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
