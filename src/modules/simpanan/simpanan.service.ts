import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JenisTransaksi, NasabahStatus, StatusTransaksi } from '@prisma/client';
import { SimpananRepository } from './simpanan.repository';
import { SimpananTransaksiDto } from './dto';
import { TransaksiRepository } from '../transaksi/transaksi.repository';
import { TransaksiService } from '../transaksi/transaksi.service';
import { DEFAULT_PAGE_SIZE } from '../../common/constants/pagination.constants';

@Injectable()
export class SimpananService {
  constructor(
    private readonly simpananRepository: SimpananRepository,
    private readonly transaksiRepository: TransaksiRepository,
    private readonly transaksiService: TransaksiService,
  ) {}

  async listRekeningByNasabah(nasabahId: number) {
    const nasabah = await this.simpananRepository.findNasabahById(nasabahId);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    const data = await this.simpananRepository.listRekeningByNasabah(nasabahId);
    return {
      message: 'Berhasil mengambil rekening simpanan nasabah',
      data,
    };
  }

  async getRekeningById(id: number) {
    const rekening = await this.simpananRepository.findRekeningById(id);
    if (!rekening) {
      throw new NotFoundException('Rekening simpanan tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil detail rekening simpanan',
      data: rekening,
    };
  }

  async setoranSimpanan(
    rekeningId: number,
    dto: SimpananTransaksiDto,
    userId: number,
  ) {
    const pegawai = await this.simpananRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (!pegawai.statusAktif) {
      throw new BadRequestException('Pegawai tidak aktif');
    }

    const rekening = await this.simpananRepository.findRekeningById(rekeningId);
    if (!rekening) {
      throw new NotFoundException('Rekening simpanan tidak ditemukan');
    }

    if (rekening.nasabah.status !== NasabahStatus.AKTIF) {
      throw new BadRequestException('Nasabah tidak aktif');
    }

    const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();

    const transaksi = await this.simpananRepository.createTransaksi({
      nasabahId: rekening.nasabahId,
      pegawaiId: pegawai.id,
      rekeningSimpananId: rekening.id,
      jenisTransaksi: JenisTransaksi.SETORAN,
      nominal: dto.nominal,
      tanggal,
      metodePembayaran: dto.metodePembayaran,
      statusTransaksi: StatusTransaksi.PENDING,
      urlBuktiTransaksi: dto.urlBuktiTransaksi,
      catatan: dto.catatan,
    });

    return this.transaksiService.processTransaksi(transaksi.id);
  }

  async penarikanSimpanan(
    rekeningId: number,
    dto: SimpananTransaksiDto,
    userId: number,
  ) {
    const pegawai = await this.simpananRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (!pegawai.statusAktif) {
      throw new BadRequestException('Pegawai tidak aktif');
    }

    const rekening = await this.simpananRepository.findRekeningById(rekeningId);
    if (!rekening) {
      throw new NotFoundException('Rekening simpanan tidak ditemukan');
    }

    if (rekening.nasabah.status !== NasabahStatus.AKTIF) {
      throw new BadRequestException('Nasabah tidak aktif');
    }

    if (rekening.saldoBerjalan.lessThan(dto.nominal)) {
      throw new BadRequestException('Saldo simpanan tidak mencukupi');
    }

    const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();

    const transaksi = await this.simpananRepository.createTransaksi({
      nasabahId: rekening.nasabahId,
      pegawaiId: pegawai.id,
      rekeningSimpananId: rekening.id,
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      nominal: dto.nominal,
      tanggal,
      metodePembayaran: dto.metodePembayaran,
      statusTransaksi: StatusTransaksi.PENDING,
      urlBuktiTransaksi: dto.urlBuktiTransaksi,
      catatan: dto.catatan,
    });

    return this.transaksiService.processTransaksi(transaksi.id);
  }

  async listTransaksiByRekening(rekeningId: number, cursor?: number) {
    const rekening = await this.simpananRepository.findRekeningById(rekeningId);
    if (!rekening) {
      throw new NotFoundException('Rekening simpanan tidak ditemukan');
    }

    const { data, nextCursor } =
      await this.transaksiRepository.listTransaksiByRekening({
        rekeningSimpananId: rekeningId,
        cursor,
        take: DEFAULT_PAGE_SIZE,
      });

    return {
      message: 'Berhasil mengambil histori transaksi simpanan',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }
}
