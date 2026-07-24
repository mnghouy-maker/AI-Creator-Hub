/**
 * Resolves which organization a request acts within. For now every user acts in
 * their personal org (created at signup); when team switching lands, this reads
 * an `X-Org-Id` header and verifies membership. Centralizing it means every
 * feature scopes data the same way — the multi-tenancy boundary lives in one
 * place (Architecture principle #4).
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's personal organization id (their default workspace). */
  async getDefaultOrgId(userId: string): Promise<string> {
    const org = await this.prisma.client.organization.findFirst({
      where: { ownerId: userId, isPersonal: true },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('No workspace found for user');
    return org.id;
  }

  /** Assert the user is a member of an org before acting within it. */
  async assertMember(userId: string, orgId: string): Promise<void> {
    const membership = await this.prisma.client.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Not a member of this workspace');
  }
}
