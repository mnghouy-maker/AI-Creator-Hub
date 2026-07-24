/**
 * POST /ai/:tool — kick off a text generation (script, blog, social, title,
 * hashtags). Returns a jobId the client streams for the result. A bad tool name
 * is a 400; insufficient credits surface as 402 via the global filter.
 */
import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { OrgService } from '../../common/org/org.service.js';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';
import { TEXT_TOOLS, generateSchema, type GenerateDto, type TextTool } from './ai.dto.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly org: OrgService,
  ) {}

  @Post(':tool')
  async generate(
    @CurrentUser() user: Principal,
    @Param('tool') tool: string,
    @Body(new ZodValidationPipe(generateSchema)) dto: GenerateDto,
  ) {
    if (!TEXT_TOOLS.includes(tool as TextTool)) {
      throw new BadRequestException(`Unknown tool "${tool}"`);
    }
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.ai.generate(tool as TextTool, orgId, user.userId, dto);
  }
}
