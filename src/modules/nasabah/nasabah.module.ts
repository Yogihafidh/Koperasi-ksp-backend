import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NasabahController } from './nasabah.controller';
import { NasabahService } from './nasabah.service';
import { NasabahRepository } from './nasabah.repository';
import { MinioService } from '../../common/storage/minio.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [NasabahController],
  providers: [NasabahService, NasabahRepository, MinioService, PrismaClient],
})
export class NasabahModule {}
