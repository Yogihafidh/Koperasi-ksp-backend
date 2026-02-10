import { Injectable } from '@nestjs/common';
import {
  PrismaClient,
  NasabahStatus,
  JenisDokumen,
  JenisSimpanan,
} from '@prisma/client';

@Injectable()
export class NasabahRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findPegawaiByUserId(userId: number) {
    return this.prisma.pegawai.findUnique({
      where: { userId },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        userId: true,
      },
    });
  }

  findNasabahByNik(nik: string) {
    return this.prisma.nasabah.findUnique({
      where: { nik },
    });
  }

  findNasabahByNomorAnggota(nomorAnggota: string) {
    return this.prisma.nasabah.findUnique({
      where: { nomorAnggota },
    });
  }

  createNasabah(data: {
    pegawaiId: number;
    nomorAnggota: string;
    nama: string;
    nik: string;
    alamat: string;
    noHp: string;
    pekerjaan: string;
    instansi?: string;
    penghasilanBulanan: number;
    tanggalLahir: Date;
    tanggalDaftar: Date;
    status: NasabahStatus;
    catatan?: string;
  }) {
    return this.prisma.nasabah.create({
      data,
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
        dokumen: true,
      },
    });
  }

  async findAllNasabah(cursor: number | undefined, take: number) {
    const data = await this.prisma.nasabah.findMany({
      where: { deletedAt: null },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
        dokumen: true,
      },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    let nextCursor: number | null = null;
    if (data.length > take) {
      const nextItem = data.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { data, nextCursor };
  }

  findNasabahById(id: number) {
    return this.prisma.nasabah.findFirst({
      where: { id, deletedAt: null },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
        dokumen: true,
      },
    });
  }

  updateNasabah(
    id: number,
    data: {
      nama?: string;
      alamat?: string;
      noHp?: string;
      pekerjaan?: string;
      instansi?: string;
      penghasilanBulanan?: number;
      tanggalLahir?: Date;
      catatan?: string;
    },
  ) {
    return this.prisma.nasabah.update({
      where: { id },
      data,
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
        dokumen: true,
      },
    });
  }

  updateNasabahStatus(id: number, status: NasabahStatus, catatan?: string) {
    return this.prisma.nasabah.update({
      where: { id },
      data: { status, catatan },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
        dokumen: true,
      },
    });
  }

  findRekeningSimpananByNasabahAndJenis(
    nasabahId: number,
    jenisSimpanan: JenisSimpanan,
  ) {
    return this.prisma.rekeningSimpanan.findFirst({
      where: { nasabahId, jenisSimpanan, deletedAt: null },
    });
  }

  createRekeningSimpanan(data: {
    nasabahId: number;
    jenisSimpanan: JenisSimpanan;
    saldoBerjalan: number;
  }) {
    return this.prisma.rekeningSimpanan.create({
      data,
    });
  }

  softDeleteNasabah(id: number) {
    return this.prisma.nasabah.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  createNasabahDokumen(data: {
    nasabahId: number;
    jenisDokumen: JenisDokumen;
    fileUrl: string;
  }) {
    return this.prisma.nasabahDokumen.create({
      data,
    });
  }
}
