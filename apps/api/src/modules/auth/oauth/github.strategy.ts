/**
 * GitHub OAuth strategy. Registered only when GITHUB_CLIENT_ID/SECRET are set.
 * GitHub may not return an email in the profile (users can keep it private), so
 * we request the `user:email` scope and read the primary email from the profile.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: `${config.get<string>('API_URL')}/api/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      username?: string;
      displayName?: string;
      emails?: { value: string }[];
      photos?: { value: string }[];
    },
    done: (err: Error | null, user?: unknown) => void,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No accessible email on GitHub account'));
    const user = await this.auth.findOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: String(profile.id),
      email,
      name: profile.displayName || profile.username,
      image: profile.photos?.[0]?.value,
    });
    done(null, { userId: user.id, role: user.role });
  }
}
