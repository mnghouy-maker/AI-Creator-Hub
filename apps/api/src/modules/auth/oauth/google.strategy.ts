/**
 * Google OAuth strategy. Only registered when GOOGLE_CLIENT_ID/SECRET are set
 * (see AuthModule) — so local dev without Google creds still boots.
 *
 * The strategy's job stops at "here is a verified Google identity"; turning that
 * into our user (link-or-provision) is AuthService.findOrCreateOAuthUser, keeping
 * provider glue separate from account logic.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${config.get<string>('API_URL')}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      displayName?: string;
      photos?: { value: string }[];
    },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google account has no email'), undefined);
    const user = await this.auth.findOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: profile.id,
      email,
      name: profile.displayName,
      image: profile.photos?.[0]?.value,
    });
    done(null, { userId: user.id, role: user.role });
  }
}
