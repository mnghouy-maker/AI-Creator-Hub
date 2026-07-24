/**
 * Wires the auth feature together and installs the GLOBAL guards.
 *
 * Two guards are registered app-wide via APP_GUARD, in order:
 *   1. AuthGuard  — every route needs a session unless @Public().
 *   2. RolesGuard — enforces @Roles() where present.
 * Registering them here (not per-controller) is what makes the API secure by
 * default (Architecture §6).
 *
 * OAuth strategies are added ONLY when their credentials exist, so the app boots
 * in local dev without Google/GitHub keys.
 */
import { Module, type Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { ProvisioningService } from './provisioning.service.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { GoogleStrategy } from './oauth/google.strategy.js';
import { GithubStrategy } from './oauth/github.strategy.js';

// Register a provider strategy only when both halves of its credentials exist.
const oauthProviders: Provider[] = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(GoogleStrategy);
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  oauthProviders.push(GithubStrategy);
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      // Session + ticket JWTs are signed with AUTH_SECRET (HS256).
      useFactory: () => ({
        secret: process.env.AUTH_SECRET,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TwoFactorService,
    ProvisioningService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    ...oauthProviders,
  ],
  exports: [SessionService, AuthService],
})
export class AuthModule {}
