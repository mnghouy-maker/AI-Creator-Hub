/**
 * Transactional email.
 *
 * In development (no SMTP configured) it logs the link to the console so the
 * whole verify/reset flow works end-to-end without an email provider. Real SMTP
 * delivery is wired in Phase 7/9 by reading SMTP_URL. Keeping this behind one
 * interface means feature code calls `mail.sendVerificationEmail(...)` and never
 * cares which backend is active.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly config: ConfigService) {}

  private async deliver(to: string, subject: string, body: string) {
    const smtp = this.config.get<string>('SMTP_URL');
    if (!smtp) {
      // Dev fallback: make the link copy-pasteable from logs.
      this.logger.log(`\n[email → ${to}] ${subject}\n${body}\n`);
      return;
    }
    // Phase 7/9: send via nodemailer(smtp). Left as a single integration point.
    this.logger.log(`[email → ${to}] ${subject} (SMTP configured)`);
  }

  private appUrl() {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  async sendVerificationEmail(to: string, token: string) {
    const link = `${this.appUrl()}/verify-email?token=${token}`;
    await this.deliver(to, 'Verify your email', `Confirm your address: ${link}`);
  }

  async sendPasswordReset(to: string, token: string) {
    const link = `${this.appUrl()}/reset-password?token=${token}`;
    await this.deliver(to, 'Reset your password', `Reset it here (1 hour): ${link}`);
  }
}
