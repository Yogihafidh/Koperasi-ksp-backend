import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PinjamanController } from './pinjaman.controller';
import { PinjamanService } from './pinjaman.service';
import { PinjamanRepository } from './pinjaman.repository';
import { TransaksiRepository } from '../transaksi/transaksi.repository';
import { TransaksiService } from '../transaksi/transaksi.service';

@Module({
  controllers: [PinjamanController],
  providers: [
    PinjamanService,
    PinjamanRepository,
    TransaksiRepository,
    TransaksiService,
    PrismaClient,
  ],
})
export class PinjamanModule {}
