/** Projects library REST API. All routes resolve the caller's org first, so
 *  ownership is enforced on every read and write. */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { ProjectType } from '@hub/db';
import { ProjectsService } from './projects.service.js';
import { OrgService } from '../../common/org/org.service.js';
import { CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly org: OrgService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: Principal,
    @Query('type') type?: ProjectType,
    @Query('q') query?: string,
    @Query('favorite') favorite?: string,
  ) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return {
      projects: await this.projects.list(orgId, { type, query, favorite: favorite === 'true' }),
    };
  }

  @Get(':id')
  async get(@CurrentUser() user: Principal, @Param('id') id: string) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.projects.get(orgId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Body() body: { title?: string; favorite?: boolean },
  ) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    if (typeof body.favorite === 'boolean')
      return this.projects.setFavorite(orgId, id, body.favorite);
    if (typeof body.title === 'string') return this.projects.rename(orgId, id, body.title);
    return this.projects.get(orgId, id);
  }

  @Post(':id/duplicate')
  async duplicate(@CurrentUser() user: Principal, @Param('id') id: string) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.projects.duplicate(orgId, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: Principal, @Param('id') id: string) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.projects.remove(orgId, id);
  }
}
