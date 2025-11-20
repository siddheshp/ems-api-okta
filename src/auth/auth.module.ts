import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OktaAuthGuard } from './okta-auth.guard';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [ConfigModule],
  providers: [OktaAuthGuard, AdminGuard],
  exports: [OktaAuthGuard, AdminGuard],
})
export class AuthModule {}
