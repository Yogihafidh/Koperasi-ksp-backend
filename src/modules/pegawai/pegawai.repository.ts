import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PegawaiRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }

  findPegawaiByUserId(userId: number) {
    return this.prisma.pegawai.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  createPegawai(data: {
    userId: number;
    nama: string;
    jabatan: string;
    noHp: string;
    alamat: string;
  }) {
    return this.prisma.pegawai.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  findAllPegawai() {
    return this.prisma.pegawai.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPegawaiById(id: number) {
    return this.prisma.pegawai.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  updatePegawai(
    id: number,
    data: {
      nama?: string;
      jabatan?: string;
      noHp?: string;
      alamat?: string;
    },
  ) {
    return this.prisma.pegawai.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  updatePegawaiStatus(id: number, statusAktif: boolean) {
    return this.prisma.pegawai.update({
      where: { id },
      data: { statusAktif },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }
}
