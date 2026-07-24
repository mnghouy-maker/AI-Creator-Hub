/** Global mail module so any feature can send transactional email. */
import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
