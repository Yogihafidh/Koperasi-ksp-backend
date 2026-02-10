import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JenisTransaksi,
  NasabahStatus,
  PinjamanStatus,
  Prisma,
  StatusTransaksi,
} from '@prisma/client';
import { TransaksiRepository } from './transaksi.repository';
import { CreateTransaksiDto } from './dto';
import { DEFAULT_PAGE_SIZE } from '../../common/constants/pagination.constants';

@Injectable()
export class TransaksiService {
  constructor(private readonly transaksiRepository: TransaksiRepository) {}

  private toDecimal(value: number) {
    return new Prisma.Decimal(value);
  }

  async createTransaksi(dto: CreateTransaksiDto, userId: number) {
    const pegawai = await this.transaksiRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (!pegawai.statusAktif) {
      throw new BadRequestException('Pegawai tidak aktif');
    }

    const nasabah = await this.transaksiRepository.findNasabahById(
      dto.nasabahId,
    );
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    if (nasabah.status !== NasabahStatus.AKTIF) {
      throw new BadRequestException('Nasabah tidak aktif');
    }

    const requiresRekening =
      dto.jenisTransaksi === JenisTransaksi.SETORAN ||
      dto.jenisTransaksi === JenisTransaksi.PENARIKAN;
    const requiresPinjaman =
      dto.jenisTransaksi === JenisTransaksi.PENCAIRAN ||
      dto.jenisTransaksi === JenisTransaksi.ANGSURAN;

    if (requiresRekening && !dto.rekeningSimpananId) {
      throw new BadRequestException('Rekening simpanan wajib diisi');
    }

    if (requiresPinjaman && !dto.pinjamanId) {
      throw new BadRequestException('Pinjaman wajib diisi');
    }

    if (dto.rekeningSimpananId && dto.pinjamanId) {
      throw new BadRequestException(
        'Rekening simpanan dan pinjaman tidak boleh bersamaan',
      );
    }

    if (requiresRekening) {
      const rekening = await this.transaksiRepository.findRekeningSimpananById(
        dto.rekeningSimpananId as number,
        dto.nasabahId,
      );
      if (!rekening) {
        throw new NotFoundException('Rekening simpanan tidak ditemukan');
      }

      if (dto.jenisTransaksi === JenisTransaksi.PENARIKAN) {
        if (rekening.saldoBerjalan.lessThan(this.toDecimal(dto.nominal))) {
          throw new BadRequestException('Saldo simpanan tidak mencukupi');
        }
      }
    }

    if (requiresPinjaman) {
      const pinjaman = await this.transaksiRepository.findPinjamanById(
        dto.pinjamanId as number,
        dto.nasabahId,
      );
      if (!pinjaman) {
        throw new NotFoundException('Pinjaman tidak ditemukan');
      }

      if (pinjaman.status !== PinjamanStatus.DISETUJUI) {
        throw new BadRequestException('Pinjaman belum disetujui');
      }

      const nominal = this.toDecimal(dto.nominal);
      if (dto.jenisTransaksi === JenisTransaksi.PENCAIRAN) {
        if (pinjaman.sisaPinjaman.greaterThan(this.toDecimal(0))) {
          throw new BadRequestException('Pencairan pinjaman sudah dibuat');
        }
        if (!nominal.equals(pinjaman.jumlahPinjaman)) {
          throw new BadRequestException('Pencairan anda tidak sesuai');
        }
      } else {
        if (pinjaman.sisaPinjaman.lessThan(nominal)) {
          throw new BadRequestException('Nominal melebihi sisa pinjaman');
        }
      }
    }

    const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();

    const transaksi = await this.transaksiRepository.createTransaksi({
      nasabahId: dto.nasabahId,
      pegawaiId: pegawai.id,
      rekeningSimpananId: dto.rekeningSimpananId,
      pinjamanId: dto.pinjamanId,
      jenisTransaksi: dto.jenisTransaksi,
      nominal: dto.nominal,
      tanggal,
      metodePembayaran: dto.metodePembayaran,
      statusTransaksi: StatusTransaksi.PENDING,
      urlBuktiTransaksi: dto.urlBuktiTransaksi,
      catatan: dto.catatan,
    });

    return this.processTransaksi(transaksi.id);
  }

  async processTransaksi(id: number) {
    const transaksi = await this.transaksiRepository.findTransaksiById(id);
    if (!transaksi) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    if (transaksi.statusTransaksi !== StatusTransaksi.PENDING) {
      throw new BadRequestException('Transaksi sudah diproses');
    }

    if (transaksi.nasabah.status !== NasabahStatus.AKTIF) {
      const rejected = await this.transaksiRepository.applyTransaksi({
        transaksiId: transaksi.id,
        statusTransaksi: StatusTransaksi.REJECTED,
        catatan: 'Nasabah tidak aktif',
      });

      return {
        message: 'Transaksi ditolak',
        data: rejected,
      };
    }

    const nominal = this.toDecimal(Number(transaksi.nominal));

    try {
      if (
        transaksi.jenisTransaksi === JenisTransaksi.SETORAN ||
        transaksi.jenisTransaksi === JenisTransaksi.PENARIKAN
      ) {
        if (!transaksi.rekeningSimpanan) {
          throw new BadRequestException('Rekening simpanan tidak ditemukan');
        }

        const saldoBerjalan = transaksi.rekeningSimpanan.saldoBerjalan;
        let saldoBaru = saldoBerjalan;

        if (transaksi.jenisTransaksi === JenisTransaksi.SETORAN) {
          saldoBaru = saldoBerjalan.plus(nominal);
        } else {
          if (saldoBerjalan.lessThan(nominal)) {
            throw new BadRequestException('Saldo simpanan tidak mencukupi');
          }
          saldoBaru = saldoBerjalan.minus(nominal);
        }

        const updated = await this.transaksiRepository.applyTransaksi({
          transaksiId: transaksi.id,
          statusTransaksi: StatusTransaksi.APPROVED,
          updateRekening: {
            id: transaksi.rekeningSimpanan.id,
            saldoBerjalan: saldoBaru,
          },
        });

        return {
          message: 'Transaksi berhasil diproses',
          data: updated,
        };
      }

      if (
        transaksi.jenisTransaksi === JenisTransaksi.PENCAIRAN ||
        transaksi.jenisTransaksi === JenisTransaksi.ANGSURAN
      ) {
        if (!transaksi.pinjaman) {
          throw new BadRequestException('Pinjaman tidak ditemukan');
        }

        if (transaksi.pinjaman.status !== PinjamanStatus.DISETUJUI) {
          throw new BadRequestException('Pinjaman belum disetujui');
        }

        const sisaPinjaman = transaksi.pinjaman.sisaPinjaman;
        let sisaBaru = sisaPinjaman;
        let statusPinjaman: PinjamanStatus | undefined;

        if (transaksi.jenisTransaksi === JenisTransaksi.PENCAIRAN) {
          const jumlahPinjaman = transaksi.pinjaman.jumlahPinjaman;
          if (sisaPinjaman.greaterThan(this.toDecimal(0))) {
            throw new BadRequestException('Pencairan pinjaman sudah dibuat');
          }
          if (!nominal.equals(jumlahPinjaman)) {
            throw new BadRequestException('Pencairan anda tidak sesuai');
          }
          sisaBaru = jumlahPinjaman;
        } else {
          if (sisaPinjaman.lessThan(nominal)) {
            throw new BadRequestException('Nominal melebihi sisa pinjaman');
          }
          sisaBaru = sisaPinjaman.minus(nominal);
          if (sisaBaru.lessThanOrEqualTo(this.toDecimal(0))) {
            statusPinjaman = PinjamanStatus.LUNAS;
          }
        }

        const updated = await this.transaksiRepository.applyTransaksi({
          transaksiId: transaksi.id,
          statusTransaksi: StatusTransaksi.APPROVED,
          updatePinjaman: {
            id: transaksi.pinjaman.id,
            sisaPinjaman: sisaBaru,
            status: statusPinjaman,
          },
        });

        return {
          message: 'Transaksi berhasil diproses',
          data: updated,
        };
      }

      throw new BadRequestException('Jenis transaksi tidak dikenali');
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Proses transaksi gagal';

      const rejected = await this.transaksiRepository.applyTransaksi({
        transaksiId: transaksi.id,
        statusTransaksi: StatusTransaksi.REJECTED,
        catatan: reason,
      });

      return {
        message: 'Transaksi ditolak',
        data: rejected,
      };
    }
  }

  async getTransaksiById(id: number) {
    const transaksi =
      await this.transaksiRepository.findTransaksiSummaryById(id);
    if (!transaksi) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil detail transaksi',
      data: transaksi,
    };
  }

  async listTransaksi(args: {
    cursor?: number;
    statusTransaksi?: StatusTransaksi;
    jenisTransaksi?: JenisTransaksi;
    tanggalFrom?: string;
    tanggalTo?: string;
  }) {
    const tanggalFrom = args.tanggalFrom
      ? new Date(args.tanggalFrom)
      : undefined;
    const tanggalTo = args.tanggalTo ? new Date(args.tanggalTo) : undefined;

    const { data, nextCursor } = await this.transaksiRepository.listTransaksi({
      cursor: args.cursor,
      take: DEFAULT_PAGE_SIZE,
      statusTransaksi: args.statusTransaksi,
      jenisTransaksi: args.jenisTransaksi,
      tanggalFrom,
      tanggalTo,
    });

    return {
      message: 'Berhasil mengambil data transaksi',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async listTransaksiByNasabah(nasabahId: number, cursor?: number) {
    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiByNasabah({
        nasabahId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil data transaksi nasabah',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async listTransaksiByPegawai(pegawaiId: number, cursor?: number) {
    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiByPegawai({
        pegawaiId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil data transaksi pegawai',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async listTransaksiPending(cursor?: number) {
    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiPending({
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil transaksi pending',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async listTransaksiByRekening(rekeningSimpananId: number, cursor?: number) {
    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiByRekening({
        rekeningSimpananId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil data transaksi rekening simpanan',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async listTransaksiByPinjaman(pinjamanId: number, cursor?: number) {
    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiByPinjaman({
        pinjamanId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil data transaksi pinjaman',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async exportTransaksi(args: {
    statusTransaksi?: StatusTransaksi;
    jenisTransaksi?: JenisTransaksi;
    tanggalFrom?: string;
    tanggalTo?: string;
  }) {
    const tanggalFrom = args.tanggalFrom
      ? new Date(args.tanggalFrom)
      : undefined;
    const tanggalTo = args.tanggalTo ? new Date(args.tanggalTo) : undefined;

    const data = await this.transaksiRepository.listTransaksiForExport({
      statusTransaksi: args.statusTransaksi,
      jenisTransaksi: args.jenisTransaksi,
      tanggalFrom,
      tanggalTo,
    });

    return {
      message: 'Berhasil menyiapkan data export transaksi',
      data,
    };
  }
}
