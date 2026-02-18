import { Injectable } from '@nestjs/common';
import {
  JenisTransaksi,
  PinjamanStatus,
  Prisma,
  PrismaClient,
  StatusTransaksi,
} from '@prisma/client';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private buildTransaksiWhere(args: {
    jenisTransaksi?: JenisTransaksi | JenisTransaksi[];
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }): Prisma.TransaksiWhereInput {
    const where: Prisma.TransaksiWhereInput = {
      deletedAt: null,
    };

    if (args.statusTransaksi) {
      where.statusTransaksi = args.statusTransaksi;
    }

    if (args.jenisTransaksi) {
      if (Array.isArray(args.jenisTransaksi)) {
        where.jenisTransaksi = { in: args.jenisTransaksi };
      } else {
        where.jenisTransaksi = args.jenisTransaksi;
      }
    }

    if (args.tanggalFrom || args.tanggalTo) {
      where.tanggal = {
        ...(args.tanggalFrom ? { gte: args.tanggalFrom } : {}),
        ...(args.tanggalTo ? { lte: args.tanggalTo } : {}),
      };
    }

    return where;
  }

  sumTransaksiNominal(args: {
    jenisTransaksi?: JenisTransaksi | JenisTransaksi[];
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    return this.prisma.transaksi.aggregate({
      where: this.buildTransaksiWhere(args),
      _sum: {
        nominal: true,
      },
    });
  }

  sumSaldoSimpanan() {
    return this.prisma.rekeningSimpanan.aggregate({
      where: { deletedAt: null },
      _sum: { saldoBerjalan: true },
    });
  }

  groupSaldoSimpananByJenis() {
    return this.prisma.rekeningSimpanan.groupBy({
      by: ['jenisSimpanan'],
      where: { deletedAt: null },
      _sum: { saldoBerjalan: true },
    });
  }

  sumPinjamanAktifNominal() {
    return this.prisma.pinjaman.aggregate({
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        sisaPinjaman: { gt: new Prisma.Decimal(0) },
      },
      _sum: { sisaPinjaman: true },
    });
  }

  listTopOutstandingPinjaman(take: number) {
    return this.prisma.pinjaman.findMany({
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        sisaPinjaman: { gt: new Prisma.Decimal(0) },
      },
      select: { id: true, sisaPinjaman: true },
      orderBy: { sisaPinjaman: 'desc' },
      take,
    });
  }

  countNasabah(where: Prisma.NasabahWhereInput) {
    return this.prisma.nasabah.count({ where });
  }

  findLaporanKeuanganByPeriode(bulan: number, tahun: number) {
    return this.prisma.laporanKeuangan.findFirst({
      where: { periodeBulan: bulan, periodeTahun: tahun },
    });
  }
}
