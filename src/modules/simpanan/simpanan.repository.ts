import { Injectable } from '@nestjs/common';
import { JenisTransaksi, PrismaClient, StatusTransaksi } from '@prisma/client';

@Injectable()
export class SimpananRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findPegawaiByUserId(userId: number) {
    return this.prisma.pegawai.findUnique({
      where: { userId },
      select: {
        id: true,
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

  listRekeningByNasabah(nasabahId: number) {
    return this.prisma.rekeningSimpanan.findMany({
      where: { nasabahId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRekeningById(id: number) {
    return this.prisma.rekeningSimpanan.findFirst({
      where: { id, deletedAt: null },
      include: {
        nasabah: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  createTransaksi(args: {
    nasabahId: number;
    pegawaiId: number;
    rekeningSimpananId: number;
    jenisTransaksi: JenisTransaksi;
    nominal: number;
    tanggal: Date;
    metodePembayaran: string;
    statusTransaksi: StatusTransaksi;
    urlBuktiTransaksi?: string;
    catatan?: string;
  }) {
    return this.prisma.transaksi.create({
      data: args,
      include: {
        nasabah: true,
        pegawai: true,
        rekeningSimpanan: true,
      },
    });
  }
}
