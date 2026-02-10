import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SimpananController } from './simpanan.controller';
import { SimpananService } from './simpanan.service';
import { SimpananRepository } from './simpanan.repository';
import { TransaksiRepository } from '../transaksi/transaksi.repository';
import { TransaksiService } from '../transaksi/transaksi.service';

@Module({
  controllers: [SimpananController],
  providers: [
    SimpananService,
    SimpananRepository,
    TransaksiRepository,
    TransaksiService,
    PrismaClient,
  ],
})
export class SimpananModule {}
