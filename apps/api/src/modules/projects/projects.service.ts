/**
 * Projects — the saved-work library. Every method is scoped by orgId so a user
 * can only ever touch their own workspace's projects (multi-tenant isolation,
 * Architecture principle #4). Backs the /projects UI: search, filter, favorite,
 * rename, duplicate, delete.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProjectType } from '@hub/db';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, filter: { type?: ProjectType; query?: string; favorite?: boolean }) {
    const where: Prisma.ProjectWhereInput = { orgId };
    if (filter.type) where.type = filter.type;
    if (filter.favorite) where.favorite = true;
    if (filter.query) where.title = { contains: filter.query, mode: 'insensitive' };
    return this.prisma.client.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        favorite: true,
        updatedAt: true,
      },
    });
  }

  async get(orgId: string, id: string) {
    const project = await this.prisma.client.project.findFirst({ where: { id, orgId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async rename(orgId: string, id: string, title: string) {
    await this.get(orgId, id); // ownership check
    return this.prisma.client.project.update({ where: { id }, data: { title } });
  }

  async setFavorite(orgId: string, id: string, favorite: boolean) {
    await this.get(orgId, id);
    return this.prisma.client.project.update({ where: { id }, data: { favorite } });
  }

  async remove(orgId: string, id: string) {
    await this.get(orgId, id);
    await this.prisma.client.project.delete({ where: { id } });
    return { ok: true };
  }

  /** Clone a project's metadata into a new draft (source content is reused). */
  async duplicate(orgId: string, id: string) {
    const src = await this.get(orgId, id);
    return this.prisma.client.project.create({
      data: {
        orgId,
        createdById: src.createdById,
        type: src.type,
        title: `${src.title} (copy)`,
        metadata: src.metadata ?? undefined,
      },
    });
  }
}
