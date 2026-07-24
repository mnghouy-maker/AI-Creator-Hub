/**
 * Two-factor auth (TOTP — the standard behind Google Authenticator, 1Password,
 * Authy). We generate a secret, hand the user an otpauth:// URL + QR code to
 * scan, and verify 6-digit codes on login.
 *
 * The secret is ENCRYPTED at rest (AES-256-GCM via crypto.util) — a database
 * leak alone must not hand an attacker working 2FA seeds (Architecture §6).
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { encryptSecret, decryptSecret } from '../../common/crypto/crypto.util.js';

@Injectable()
export class TwoFactorService {
  constructor(private readonly config: ConfigService) {}

  private secret() {
    return this.config.get<string>('AUTH_SECRET')!;
  }

  /** Create a new TOTP secret + a scannable QR code for enrollment. */
  async generate(
    userEmail: string,
  ): Promise<{ encryptedSecret: string; qrDataUrl: string; otpauth: string }> {
    const raw = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(userEmail, 'AI Creator Hub', raw);
    const qrDataUrl = await toDataURL(otpauth);
    return { encryptedSecret: encryptSecret(raw, this.secret()), qrDataUrl, otpauth };
  }

  /** Verify a 6-digit code against the (encrypted) stored secret. */
  verify(code: string, encryptedSecret: string): boolean {
    try {
      const raw = decryptSecret(encryptedSecret, this.secret());
      return authenticator.verify({ token: code, secret: raw });
    } catch {
      return false;
    }
  }
}
