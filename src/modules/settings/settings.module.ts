import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository, PrismaClient],
  exports: [SettingsService],
})
export class SettingsModule {}
