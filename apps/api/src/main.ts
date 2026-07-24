/**
 * API entrypoint.
 *
 * Bootstraps the Nest app with the security posture from Architecture §6 baked
 * in from day one: Helmet security headers, CORS locked to the web origin, a
 * global validation pipe (whitelist strips unknown fields), and a versioned
 * `/api` prefix. Keeping these here means every route inherits them — security
 * is not opt-in per controller.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true, // cookies carry the session (Architecture §4.6)
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}/api`);
}

void bootstrap();
