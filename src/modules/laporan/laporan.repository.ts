import { Injectable } from '@nestjs/common';
import {
  JenisSimpanan,
  JenisTransaksi,
  PinjamanStatus,
  Prisma,
  PrismaClient,
  StatusLaporan,
  StatusTransaksi,
} from '@prisma/client';

@Injectable()
export class LaporanRepository {
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

  countTransaksi(args: {
    jenisTransaksi?: JenisTransaksi | JenisTransaksi[];
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    return this.prisma.transaksi.aggregate({
      where: this.buildTransaksiWhere(args),
      _count: { _all: true },
    });
  }

  groupTransaksiByJenis(args: {
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    return this.prisma.transaksi.groupBy({
      by: ['jenisTransaksi'],
      where: this.buildTransaksiWhere(args),
      _count: { _all: true },
      _sum: { nominal: true },
    });
  }

  groupTransaksiByStatus(args: {
    jenisTransaksi?: JenisTransaksi | JenisTransaksi[];
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    return this.prisma.transaksi.groupBy({
      by: ['statusTransaksi'],
      where: this.buildTransaksiWhere(args),
      _count: { _all: true },
    });
  }

  maxTransaksiNominal(args: {
    jenisTransaksi?: JenisTransaksi | JenisTransaksi[];
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    return this.prisma.transaksi.aggregate({
      where: this.buildTransaksiWhere(args),
      _max: { nominal: true },
    });
  }

  topNasabahByTransaksi(args: {
    jenisTransaksi: JenisTransaksi;
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
    take?: number;
  }) {
    return this.prisma.transaksi.groupBy({
      by: ['nasabahId'],
      where: this.buildTransaksiWhere({
        jenisTransaksi: args.jenisTransaksi,
        statusTransaksi: args.statusTransaksi,
        tanggalFrom: args.tanggalFrom,
        tanggalTo: args.tanggalTo,
      }),
      _count: { _all: true },
      orderBy: {
        _count: { nasabahId: 'desc' },
      },
      take: args.take ?? 1,
    });
  }

  topNasabahByNominal(args: {
    jenisTransaksi: JenisTransaksi;
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
    take?: number;
  }) {
    return this.prisma.transaksi.groupBy({
      by: ['nasabahId'],
      where: this.buildTransaksiWhere({
        jenisTransaksi: args.jenisTransaksi,
        statusTransaksi: args.statusTransaksi,
        tanggalFrom: args.tanggalFrom,
        tanggalTo: args.tanggalTo,
      }),
      _sum: { nominal: true },
      orderBy: {
        _sum: { nominal: 'desc' },
      },
      take: args.take ?? 1,
    });
  }

  findNasabahByIds(ids: number[]) {
    return this.prisma.nasabah.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, nama: true, nomorAnggota: true },
    });
  }

  countPinjamanAktif() {
    return this.prisma.pinjaman.count({
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        sisaPinjaman: { gt: new Prisma.Decimal(0) },
      },
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
      select: { sisaPinjaman: true },
      orderBy: { sisaPinjaman: 'desc' },
      take,
    });
  }

  aggregatePinjamanPeriode(args: { tanggalFrom: Date; tanggalTo: Date }) {
    return this.prisma.pinjaman.aggregate({
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        tanggalPersetujuan: {
          gte: args.tanggalFrom,
          lte: args.tanggalTo,
        },
      },
      _sum: { jumlahPinjaman: true },
      _min: { jumlahPinjaman: true },
      _max: { jumlahPinjaman: true },
      _avg: { bungaPersen: true },
    });
  }

  countPinjamanBaru(args: { tanggalFrom: Date; tanggalTo: Date }) {
    return this.prisma.pinjaman.count({
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        tanggalPersetujuan: {
          gte: args.tanggalFrom,
          lte: args.tanggalTo,
        },
      },
    });
  }

  groupPinjamanTenor(args: { tanggalFrom: Date; tanggalTo: Date }) {
    return this.prisma.pinjaman.groupBy({
      by: ['tenorBulan'],
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        tanggalPersetujuan: {
          gte: args.tanggalFrom,
          lte: args.tanggalTo,
        },
      },
      _count: { _all: true },
      orderBy: {
        _count: { tenorBulan: 'desc' },
      },
      take: 1,
    });
  }

  async countAngsuranLunasInPeriod(args: {
    tanggalFrom: Date;
    tanggalTo: Date;
  }) {
    const grouped = await this.prisma.transaksi.groupBy({
      where: {
        deletedAt: null,
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggal: {
          gte: args.tanggalFrom,
          lte: args.tanggalTo,
        },
        pinjaman: {
          status: PinjamanStatus.LUNAS,
        },
      },
      by: ['pinjamanId'],
      _count: { _all: true },
    });

    return grouped.length;
  }

  async countDistinctNasabahTransaksi(args: {
    jenisTransaksi: JenisTransaksi;
    statusTransaksi?: StatusTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    const grouped = await this.prisma.transaksi.groupBy({
      by: ['nasabahId'],
      where: this.buildTransaksiWhere({
        jenisTransaksi: args.jenisTransaksi,
        statusTransaksi: args.statusTransaksi,
        tanggalFrom: args.tanggalFrom,
        tanggalTo: args.tanggalTo,
      }),
      _count: { _all: true },
    });

    return grouped.length;
  }

  groupSaldoSimpananByJenis() {
    return this.prisma.rekeningSimpanan.groupBy({
      by: ['jenisSimpanan'],
      where: { deletedAt: null },
      _sum: { saldoBerjalan: true },
    });
  }

  sumSaldoSimpanan() {
    return this.prisma.rekeningSimpanan.aggregate({
      where: { deletedAt: null },
      _sum: { saldoBerjalan: true },
    });
  }

  countRekeningWajibBelumSetor(args: { tanggalFrom: Date; tanggalTo: Date }) {
    return this.prisma.rekeningSimpanan.count({
      where: {
        deletedAt: null,
        jenisSimpanan: JenisSimpanan.WAJIB,
        transaksi: {
          none: {
            deletedAt: null,
            jenisTransaksi: JenisTransaksi.SETORAN,
            statusTransaksi: StatusTransaksi.APPROVED,
            tanggal: {
              gte: args.tanggalFrom,
              lte: args.tanggalTo,
            },
          },
        },
      },
    });
  }

  maxSaldoSimpanan() {
    return this.prisma.rekeningSimpanan.aggregate({
      where: { deletedAt: null },
      _max: { saldoBerjalan: true },
    });
  }

  countRekeningSaldoKecil(threshold: number) {
    return this.prisma.rekeningSimpanan.count({
      where: {
        deletedAt: null,
        saldoBerjalan: { lt: threshold },
      },
    });
  }

  countNasabah(where: Prisma.NasabahWhereInput) {
    return this.prisma.nasabah.count({ where });
  }

  listNasabahBasic() {
    return this.prisma.nasabah.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  groupLastTransaksiPerNasabah() {
    return this.prisma.transaksi.groupBy({
      by: ['nasabahId'],
      where: {
        deletedAt: null,
        statusTransaksi: StatusTransaksi.APPROVED,
      },
      _max: { tanggal: true },
    });
  }

  async countNasabahWithPinjamanAktif() {
    const grouped = await this.prisma.pinjaman.groupBy({
      where: {
        deletedAt: null,
        status: PinjamanStatus.DISETUJUI,
        sisaPinjaman: { gt: new Prisma.Decimal(0) },
        nasabah: { deletedAt: null },
      },
      by: ['nasabahId'],
      _count: { _all: true },
    });

    return grouped.length;
  }

  findLaporanKeuanganByPeriode(bulan: number, tahun: number) {
    return this.prisma.laporanKeuangan.findFirst({
      where: { periodeBulan: bulan, periodeTahun: tahun },
    });
  }

  findPreviousFinalLaporan(bulan: number, tahun: number) {
    return this.prisma.laporanKeuangan.findFirst({
      where: {
        statusLaporan: StatusLaporan.FINAL,
        OR: [
          { periodeTahun: { lt: tahun } },
          { periodeTahun: tahun, periodeBulan: { lt: bulan } },
        ],
      },
      orderBy: [{ periodeTahun: 'desc' }, { periodeBulan: 'desc' }],
    });
  }

  createLaporanKeuangan(data: {
    periodeBulan: number;
    periodeTahun: number;
    totalSimpanan: number;
    totalPenarikan: number;
    totalPinjaman: number;
    totalAngsuran: number;
    saldoAkhir: number;
    statusLaporan: StatusLaporan;
    generatedById: number;
    generatedAt: Date;
  }) {
    return this.prisma.laporanKeuangan.create({ data });
  }

  updateLaporanKeuangan(
    id: number,
    data: {
      totalSimpanan: number;
      totalPenarikan: number;
      totalPinjaman: number;
      totalAngsuran: number;
      saldoAkhir: number;
      generatedAt: Date;
    },
  ) {
    return this.prisma.laporanKeuangan.update({ where: { id }, data });
  }

  updateLaporanStatus(id: number, status: StatusLaporan) {
    return this.prisma.laporanKeuangan.update({
      where: { id },
      data: { statusLaporan: status },
    });
  }

  findLaporanKeuanganById(id: number) {
    return this.prisma.laporanKeuangan.findUnique({ where: { id } });
  }
}
