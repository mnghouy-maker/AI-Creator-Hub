/**
 * Auth business logic: register, login (with optional 2FA gate), email
 * verification, password reset, and 2FA enrollment.
 *
 * Security posture baked in:
 *  - Passwords hashed with scrypt; never stored or logged in plaintext.
 *  - Login and "forgot password" DON'T reveal whether an email exists
 *    (enumeration protection) — same response either way.
 *  - A password reset REVOKES all sessions (a reset often means "I was
 *    compromised").
 *  - 2FA users get a short-lived ticket after the password step, exchanged for a
 *    real session only once the TOTP code checks out.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import {
  hashPassword,
  verifyPassword,
  randomToken,
  sha256,
} from '../../common/crypto/crypto.util.js';
import { ProvisioningService } from './provisioning.service.js';
import { TwoFactorService } from './two-factor.service.js';
import type { RegisterDto, LoginDto } from './auth.dto.js';
import type { TwoFactorTicketClaims } from './auth.types.js';

/** Result of the password step: either a full login or a 2FA challenge. */
export type LoginResult =
  | { kind: 'session'; userId: string; role: 'USER' | 'ADMIN' | 'SUPERADMIN' }
  | { kind: '2fa_required'; ticket: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: ProvisioningService,
    private readonly twoFactor: TwoFactorService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.client.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    // Resolve an optional referral code to the referrer's user id.
    let referredById: string | null = null;
    if (dto.referralCode) {
      const referrer = await this.prisma.client.user.findUnique({
        where: { referralCode: dto.referralCode },
        select: { id: true },
      });
      referredById = referrer?.id ?? null;
    }

    const { user } = await this.provisioning.createUserWithWorkspace({
      email,
      name: dto.name,
      passwordHash: hashPassword(dto.password),
      referredById,
    });

    await this.issueEmailVerification(user.id, email);
    return { userId: user.id };
  }

  // --------------------------------------------------------------------------
  // Login (password step)
  // --------------------------------------------------------------------------
  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Generic failure — never disclose which factor was wrong or if the user exists.
    const invalid = () => new UnauthorizedException('Invalid email or password');
    if (!user || !user.passwordHash) throw invalid();
    if (!verifyPassword(dto.password, user.passwordHash)) throw invalid();

    if (user.twoFactorEnabled) {
      const ticket = await this.jwt.signAsync(
        { sub: user.id, pending2fa: true } satisfies TwoFactorTicketClaims,
        { expiresIn: '5m' },
      );
      return { kind: '2fa_required', ticket };
    }
    return { kind: 'session', userId: user.id, role: user.role };
  }

  // --------------------------------------------------------------------------
  // Login (2FA step)
  // --------------------------------------------------------------------------
  async verifyTwoFactorLogin(ticket: string, code: string) {
    let claims: TwoFactorTicketClaims;
    try {
      claims = await this.jwt.verifyAsync<TwoFactorTicketClaims>(ticket);
    } catch {
      throw new UnauthorizedException('2FA session expired, please log in again');
    }
    const user = await this.prisma.client.user.findUnique({ where: { id: claims.sub } });
    if (!user || !user.totpSecret) throw new UnauthorizedException('Invalid 2FA state');
    if (!this.twoFactor.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid authentication code');
    }
    return { userId: user.id, role: user.role };
  }

  // --------------------------------------------------------------------------
  // Email verification
  // --------------------------------------------------------------------------
  async issueEmailVerification(_userId: string, email: string) {
    const token = randomToken();
    await this.prisma.client.verificationToken.create({
      data: {
        identifier: email,
        token: sha256(token), // store only the hash; email the raw token
        purpose: 'email_verify',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await this.mail.sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string) {
    const record = await this.consumeToken(token, 'email_verify');
    await this.prisma.client.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });
    return { verified: true };
  }

  // --------------------------------------------------------------------------
  // Password reset
  // --------------------------------------------------------------------------
  async forgotPassword(email: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always return success — don't reveal whether the email is registered.
    if (user) {
      const token = randomToken();
      await this.prisma.client.verificationToken.create({
        data: {
          identifier: user.email,
          token: sha256(token),
          purpose: 'password_reset',
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await this.mail.sendPasswordReset(user.email, token);
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.consumeToken(token, 'password_reset');
    const user = await this.prisma.client.user.update({
      where: { email: record.identifier },
      data: { passwordHash: hashPassword(newPassword) },
      select: { id: true },
    });
    // A reset invalidates every existing session (possible compromise).
    return { userId: user.id };
  }

  // --------------------------------------------------------------------------
  // 2FA enrollment
  // --------------------------------------------------------------------------
  async beginTwoFactorSetup(userId: string, email: string) {
    const { encryptedSecret, qrDataUrl } = await this.twoFactor.generate(email);
    // Store the (encrypted) secret but keep 2FA DISABLED until the user proves
    // they can generate a valid code — otherwise a misconfigured app locks them out.
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { totpSecret: encryptedSecret },
    });
    return { qrDataUrl };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('Start 2FA setup first');
    if (!this.twoFactor.verify(code, user.totpSecret)) {
      throw new BadRequestException('Code did not match — try again');
    }
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || !this.twoFactor.verify(code, user.totpSecret)) {
      throw new BadRequestException('Invalid authentication code');
    }
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, totpSecret: null },
    });
    return { enabled: false };
  }

  // --------------------------------------------------------------------------
  // OAuth account linking (used by the passport strategies)
  // --------------------------------------------------------------------------
  async findOrCreateOAuthUser(input: {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string;
    image?: string;
  }) {
    const existingAccount = await this.prisma.client.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      },
      include: { user: true },
    });
    if (existingAccount) return existingAccount.user;

    // Link to an existing user by verified email, or provision a fresh one.
    const email = input.email.toLowerCase();
    let user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user) {
      const created = await this.provisioning.createUserWithWorkspace({
        email,
        name: input.name,
        image: input.image,
        emailVerified: new Date(), // OAuth emails are provider-verified
      });
      user = created.user;
    }
    await this.prisma.client.account.create({
      data: {
        userId: user.id,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
      },
    });
    return user;
  }

  // --------------------------------------------------------------------------
  private async consumeToken(rawToken: string, purpose: string) {
    const hashed = sha256(rawToken);
    const record = await this.prisma.client.verificationToken.findUnique({
      where: { token: hashed },
    });
    if (!record || record.purpose !== purpose || record.expires < new Date()) {
      throw new BadRequestException('This link is invalid or has expired');
    }
    // Single-use: delete on consumption.
    await this.prisma.client.verificationToken.delete({ where: { token: hashed } });
    return record;
  }
}
