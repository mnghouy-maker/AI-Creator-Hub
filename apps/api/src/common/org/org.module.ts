/** Global module exposing OrgService — every feature scopes data by org. */
import { Global, Module } from '@nestjs/common';
import { OrgService } from './org.service.js';

@Global()
@Module({ providers: [OrgService], exports: [OrgService] })
export class OrgModule {}
