/** Credit balance + ledger endpoints. Powers the dashboard credit meter and the
 *  account/history views. Scoped to the caller's org — no cross-tenant reads. */
import { Controller, Get } from '@nestjs/common';
import { CreditsService } from './credits.service.js';
import { OrgService } from '../../common/org/org.service.js';
import { CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';

@Controller('credits')
export class CreditsController {
  constructor(
    private readonly credits: CreditsService,
    private readonly org: OrgService,
  ) {}

  @Get('balance')
  async balance(@CurrentUser() user: Principal) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.credits.getBalances(orgId);
  }

  @Get('ledger')
  async ledger(@CurrentUser() user: Principal) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return { entries: await this.credits.ledger(orgId) };
  }
}
