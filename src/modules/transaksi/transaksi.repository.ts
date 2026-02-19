import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  StatusTransaksi,
  JenisTransaksi,
  PinjamanStatus,
} from '@prisma/client';

@Injectable()
export class TransaksiRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private readonly transaksiSummarySelect: Prisma.TransaksiSelect = {
    id: true,
    nasabahId: true,
    pegawaiId: true,
    rekeningSimpananId: true,
    pinjamanId: true,
    jenisTransaksi: true,
    nominal: true,
    tanggal: true,
    metodePembayaran: true,
    statusTransaksi: true,
    urlBuktiTransaksi: true,
    catatan: true,
    createdAt: true,
    deletedAt: true,
  };

  findPegawaiByUserId(userId: number) {
    return this.prisma.pegawai.findUnique({
      where: { userId },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        userId: true,
        statusAktif: true,
      },
    });
  }

  findNasabahById(id: number) {
    return this.prisma.nasabah.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
      },
    });
  }

  sumNominalByNasabahPerTanggal(args: {
    nasabahId: number;
    tanggalFrom: Date;
    tanggalTo: Date;
  }) {
    return this.prisma.transaksi.aggregate({
      where: {
        deletedAt: null,
        nasabahId: args.nasabahId,
        statusTransaksi: {
          in: [StatusTransaksi.PENDING, StatusTransaksi.APPROVED],
        },
        tanggal: {
          gte: args.tanggalFrom,
          lte: args.tanggalTo,
        },
      },
      _sum: {
        nominal: true,
      },
    });
  }

  findRekeningSimpananById(id: number, nasabahId: number) {
    return this.prisma.rekeningSimpanan.findFirst({
      where: { id, nasabahId, deletedAt: null },
    });
  }

  findPinjamanById(id: number, nasabahId: number) {
    return this.prisma.pinjaman.findFirst({
      where: { id, nasabahId, deletedAt: null },
    });
  }

  createTransaksi(data: {
    nasabahId: number;
    pegawaiId: number;
    rekeningSimpananId?: number;
    pinjamanId?: number;
    jenisTransaksi: JenisTransaksi;
    nominal: number;
    tanggal: Date;
    metodePembayaran: string;
    statusTransaksi: StatusTransaksi;
    urlBuktiTransaksi?: string;
    catatan?: string;
  }) {
    return this.prisma.transaksi.create({
      data,
      select: this.transaksiSummarySelect,
    });
  }

  findTransaksiById(id: number) {
    return this.prisma.transaksi.findFirst({
      where: { id, deletedAt: null },
      include: {
        nasabah: true,
        pegawai: true,
        rekeningSimpanan: true,
        pinjaman: true,
      },
    });
  }

  findTransaksiSummaryById(id: number) {
    return this.prisma.transaksi.findFirst({
      where: { id, deletedAt: null },
      select: this.transaksiSummarySelect,
    });
  }

  private async findTransaksiList(args: {
    cursor?: number;
    take: number;
    where: Record<string, unknown>;
  }) {
    const data = await this.prisma.transaksi.findMany({
      where: { deletedAt: null, ...args.where },
      select: this.transaksiSummarySelect,
      orderBy: { id: 'desc' },
      take: args.take + 1,
      ...(args.cursor
        ? {
            cursor: { id: args.cursor },
            skip: 1,
          }
        : {}),
    });

    let nextCursor: number | null = null;
    if (data.length > args.take) {
      const nextItem = data.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { data, nextCursor };
  }

  listTransaksi(args: {
    cursor?: number;
    take: number;
    statusTransaksi?: StatusTransaksi;
    jenisTransaksi?: JenisTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    const where: Record<string, unknown> = {};
    if (args.statusTransaksi) {
      where.statusTransaksi = args.statusTransaksi;
    }
    if (args.jenisTransaksi) {
      where.jenisTransaksi = args.jenisTransaksi;
    }
    if (args.tanggalFrom || args.tanggalTo) {
      where.tanggal = {
        ...(args.tanggalFrom ? { gte: args.tanggalFrom } : {}),
        ...(args.tanggalTo ? { lte: args.tanggalTo } : {}),
      };
    }

    return this.findTransaksiList({
      cursor: args.cursor,
      take: args.take,
      where,
    });
  }

  listTransaksiByNasabah(args: {
    nasabahId: number;
    cursor?: number;
    take: number;
  }) {
    return this.findTransaksiList({
      cursor: args.cursor,
      take: args.take,
      where: { nasabahId: args.nasabahId },
    });
  }

  listTransaksiByPegawai(args: {
    pegawaiId: number;
    cursor?: number;
    take: number;
  }) {
    return this.findTransaksiList({
      cursor: args.cursor,
      take: args.take,
      where: { pegawaiId: args.pegawaiId },
    });
  }

  listTransaksiPending(args: { cursor?: number; take: number }) {
    return this.findTransaksiList({
      cursor: args.cursor,
      take: args.take,
      where: { statusTransaksi: StatusTransaksi.PENDING },
    });
  }

  listTransaksiByRekening(args: {
    rekeningSimpananId: number;
    cursor?: number;
    take: number;
  }) {
    return this.findTransaksiList({
      cursor: args.cursor,
      take: args.take,
      where: { rekeningSimpananId: args.rekeningSimpananId },
    });
  }

  listTransaksiByPinjaman(args: {
    pinjamanId: number;
    cursor?: number;
    take: number;
  }) {
    return this.findTransaksiList({
      cursor: args.cursor,
      take: args.take,
      where: { pinjamanId: args.pinjamanId },
    });
  }

  listTransaksiForExport(args: {
    statusTransaksi?: StatusTransaksi;
    jenisTransaksi?: JenisTransaksi;
    tanggalFrom?: Date;
    tanggalTo?: Date;
  }) {
    const where: Record<string, unknown> = {};
    if (args.statusTransaksi) {
      where.statusTransaksi = args.statusTransaksi;
    }
    if (args.jenisTransaksi) {
      where.jenisTransaksi = args.jenisTransaksi;
    }
    if (args.tanggalFrom || args.tanggalTo) {
      where.tanggal = {
        ...(args.tanggalFrom ? { gte: args.tanggalFrom } : {}),
        ...(args.tanggalTo ? { lte: args.tanggalTo } : {}),
      };
    }

    return this.prisma.transaksi.findMany({
      where: { deletedAt: null, ...where },
      select: this.transaksiSummarySelect,
      orderBy: { id: 'desc' },
    });
  }

  applyTransaksi(args: {
    transaksiId: number;
    statusTransaksi: StatusTransaksi;
    catatan?: string;
    updateRekening?: {
      id: number;
      saldoBerjalan: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
    };
    updatePinjaman?: {
      id: number;
      sisaPinjaman: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
      status?: PinjamanStatus;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (args.updateRekening) {
        await tx.rekeningSimpanan.update({
          where: { id: args.updateRekening.id },
          data: { saldoBerjalan: args.updateRekening.saldoBerjalan },
        });
      }

      if (args.updatePinjaman) {
        await tx.pinjaman.update({
          where: { id: args.updatePinjaman.id },
          data: {
            sisaPinjaman: args.updatePinjaman.sisaPinjaman,
            ...(args.updatePinjaman.status
              ? { status: args.updatePinjaman.status }
              : {}),
          },
        });
      }

      return tx.transaksi.update({
        where: { id: args.transaksiId },
        data: {
          statusTransaksi: args.statusTransaksi,
          catatan: args.catatan ?? undefined,
        },
        select: this.transaksiSummarySelect,
      });
    });
  }
}
