/** Video translator feature (upload signing + pipeline job creation). */
import { Module } from '@nestjs/common';
import { VideoService } from './video.service.js';
import { VideoController } from './video.controller.js';
import { JobsModule } from '../jobs/jobs.module.js';

@Module({
  imports: [JobsModule],
  providers: [VideoService],
  controllers: [VideoController],
})
export class VideoModule {}
