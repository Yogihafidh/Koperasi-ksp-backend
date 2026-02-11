import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LaporanController } from './laporan.controller';
import { LaporanService } from './laporan.service';
import { LaporanRepository } from './laporan.repository';

@Module({
  controllers: [LaporanController],
  providers: [LaporanService, LaporanRepository, PrismaClient],
})
export class LaporanModule {}
