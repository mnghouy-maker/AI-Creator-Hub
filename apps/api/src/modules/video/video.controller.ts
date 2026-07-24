/** Video translator endpoints: presign an upload, then start a translation. */
import { Body, Controller, Post } from '@nestjs/common';
import { VideoService } from './video.service.js';
import { OrgService } from '../../common/org/org.service.js';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';
import {
  uploadUrlSchema,
  translateSchema,
  type UploadUrlDto,
  type TranslateDto,
} from './video.dto.js';

@Controller('video')
export class VideoController {
  constructor(
    private readonly video: VideoService,
    private readonly org: OrgService,
  ) {}

  @Post('upload-url')
  async uploadUrl(
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(uploadUrlSchema)) dto: UploadUrlDto,
  ) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.video.createUploadUrl(orgId, dto);
  }

  @Post('translate')
  async translate(
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(translateSchema)) dto: TranslateDto,
  ) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.video.translate(orgId, user.userId, dto);
  }
}
