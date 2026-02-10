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
import { PinjamanRepository } from './pinjaman.repository';
import {
  AngsuranPinjamanDto,
  CreatePinjamanDto,
  PencairanPinjamanDto,
  VerifikasiPinjamanDto,
} from './dto';
import { TransaksiRepository } from '../transaksi/transaksi.repository';
import { TransaksiService } from '../transaksi/transaksi.service';
import { DEFAULT_PAGE_SIZE } from '../../common/constants/pagination.constants';

@Injectable()
export class PinjamanService {
  constructor(
    private readonly pinjamanRepository: PinjamanRepository,
    private readonly transaksiRepository: TransaksiRepository,
    private readonly transaksiService: TransaksiService,
  ) {}

  private toDecimal(value: number | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }

  async createPinjaman(dto: CreatePinjamanDto) {
    const nasabah = await this.pinjamanRepository.findNasabahById(
      dto.nasabahId,
    );
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    if (nasabah.status !== NasabahStatus.AKTIF) {
      throw new BadRequestException('Nasabah tidak aktif');
    }

    const pinjaman = await this.pinjamanRepository.createPinjaman({
      nasabahId: dto.nasabahId,
      jumlahPinjaman: dto.jumlahPinjaman,
      bungaPersen: dto.bungaPersen,
      tenorBulan: dto.tenorBulan,
      sisaPinjaman: 0,
      status: PinjamanStatus.PENDING,
    });

    return {
      message: 'Pengajuan pinjaman berhasil dibuat',
      data: pinjaman,
    };
  }

  async getPinjamanById(id: number) {
    const pinjaman = await this.pinjamanRepository.findPinjamanById(id);
    if (!pinjaman) {
      throw new NotFoundException('Pinjaman tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil detail pinjaman',
      data: pinjaman,
    };
  }

  async listPinjamanByNasabah(nasabahId: number, cursor?: number) {
    const { data, nextCursor } =
      await this.pinjamanRepository.listPinjamanByNasabah({
        nasabahId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil data pinjaman nasabah',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async verifikasiPinjaman(
    id: number,
    dto: VerifikasiPinjamanDto,
    userId: number,
  ) {
    const pinjaman = await this.pinjamanRepository.findPinjamanById(id);
    if (!pinjaman) {
      throw new NotFoundException('Pinjaman tidak ditemukan');
    }

    if (pinjaman.status !== PinjamanStatus.PENDING) {
      throw new BadRequestException('Pinjaman sudah diverifikasi');
    }

    if (
      dto.status !== PinjamanStatus.DISETUJUI &&
      dto.status !== PinjamanStatus.DITOLAK
    ) {
      throw new BadRequestException('Status verifikasi tidak valid');
    }

    const pegawai = await this.pinjamanRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (!pegawai.statusAktif) {
      throw new BadRequestException('Pegawai tidak aktif');
    }

    const updated = await this.pinjamanRepository.updatePinjamanStatus({
      id,
      status: dto.status,
      verifiedById: pegawai.id,
      tanggalPersetujuan: new Date(),
    });

    return {
      message: 'Verifikasi pinjaman berhasil',
      data: updated,
    };
  }

  async pencairanPinjaman(
    id: number,
    dto: PencairanPinjamanDto,
    userId: number,
  ) {
    const pinjaman = await this.pinjamanRepository.findPinjamanById(id);
    if (!pinjaman) {
      throw new NotFoundException('Pinjaman tidak ditemukan');
    }

    if (pinjaman.status !== PinjamanStatus.DISETUJUI) {
      throw new BadRequestException('Pinjaman belum disetujui');
    }

    if (this.toDecimal(pinjaman.sisaPinjaman).greaterThan(this.toDecimal(0))) {
      throw new BadRequestException('Pencairan pinjaman sudah dibuat');
    }

    const pencairanAgg =
      await this.pinjamanRepository.findPencairanTransaksi(id);
    const totalPencairan = pencairanAgg._sum.nominal ?? this.toDecimal(0);

    const pegawai = await this.pinjamanRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (!pegawai.statusAktif) {
      throw new BadRequestException('Pegawai tidak aktif');
    }

    const jumlahPinjaman = this.toDecimal(pinjaman.jumlahPinjaman);
    if (totalPencairan.greaterThan(this.toDecimal(0))) {
      throw new BadRequestException('Pencairan pinjaman sudah dibuat');
    }

    const nominal = dto.nominal ?? jumlahPinjaman.toNumber();
    const nominalDecimal = this.toDecimal(nominal);
    if (nominalDecimal.lessThanOrEqualTo(this.toDecimal(0))) {
      throw new BadRequestException('Nominal pencairan tidak valid');
    }
    if (!nominalDecimal.equals(jumlahPinjaman)) {
      throw new BadRequestException('Pencairan anda tidak sesuai');
    }

    const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();

    const transaksi = await this.pinjamanRepository.createTransaksi({
      nasabahId: pinjaman.nasabahId,
      pegawaiId: pegawai.id,
      pinjamanId: pinjaman.id,
      jenisTransaksi: JenisTransaksi.PENCAIRAN,
      nominal,
      tanggal,
      metodePembayaran: dto.metodePembayaran,
      statusTransaksi: StatusTransaksi.PENDING,
      urlBuktiTransaksi: dto.urlBuktiTransaksi,
      catatan: dto.catatan,
    });

    return this.transaksiService.processTransaksi(transaksi.id);
  }

  async angsuranPinjaman(id: number, dto: AngsuranPinjamanDto, userId: number) {
    const pinjaman = await this.pinjamanRepository.findPinjamanById(id);
    if (!pinjaman) {
      throw new NotFoundException('Pinjaman tidak ditemukan');
    }

    if (pinjaman.status !== PinjamanStatus.DISETUJUI) {
      throw new BadRequestException('Pinjaman belum disetujui');
    }

    if (pinjaman.sisaPinjaman.lessThanOrEqualTo(this.toDecimal(0))) {
      throw new BadRequestException('Pinjaman sudah lunas');
    }

    if (pinjaman.sisaPinjaman.lessThan(this.toDecimal(dto.nominal))) {
      throw new BadRequestException('Nominal melebihi sisa pinjaman');
    }

    const pegawai = await this.pinjamanRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (!pegawai.statusAktif) {
      throw new BadRequestException('Pegawai tidak aktif');
    }

    const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();

    const transaksi = await this.pinjamanRepository.createTransaksi({
      nasabahId: pinjaman.nasabahId,
      pegawaiId: pegawai.id,
      pinjamanId: pinjaman.id,
      jenisTransaksi: JenisTransaksi.ANGSURAN,
      nominal: dto.nominal,
      tanggal,
      metodePembayaran: dto.metodePembayaran,
      statusTransaksi: StatusTransaksi.PENDING,
      urlBuktiTransaksi: dto.urlBuktiTransaksi,
      catatan: dto.catatan,
    });

    return this.transaksiService.processTransaksi(transaksi.id);
  }

  async listTransaksiByPinjaman(pinjamanId: number, cursor?: number) {
    const pinjaman = await this.pinjamanRepository.findPinjamanById(pinjamanId);
    if (!pinjaman) {
      throw new NotFoundException('Pinjaman tidak ditemukan');
    }

    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiByPinjaman({
        pinjamanId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil histori transaksi pinjaman',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }
}
