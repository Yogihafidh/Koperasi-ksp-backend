import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TransaksiController } from './transaksi.controller';
import { TransaksiRelationsController } from './transaksi.relations.controller';
import { TransaksiService } from './transaksi.service';
import { TransaksiRepository } from './transaksi.repository';

@Module({
  controllers: [TransaksiController, TransaksiRelationsController],
  providers: [TransaksiService, TransaksiRepository, PrismaClient],
})
export class TransaksiModule {}
