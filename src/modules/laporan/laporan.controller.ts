import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LaporanService } from './laporan.service';
import { LaporanPeriodDto } from './dto';
import { CurrentUser, Permissions, Roles } from '../../common/decorators';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
} from '../../common/guards';
import { ApiAuthErrors } from '../../common/decorators/api-docs.decorator';
import type { UserFromJwt } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('laporan')
@Controller('laporan')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LaporanController {
  constructor(private readonly laporanService: LaporanService) {}

  @Get('bulanan')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan bulanan (executive summary)' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan bulanan berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan bulanan',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            totalSimpananMasuk: 15000000,
            totalPinjamanDiberikan: 20000000,
            totalAngsuranDiterima: 3500000,
            totalPenarikan: 2500000,
            totalPencairan: 20000000,
            saldoAwal: 10000000,
            saldoAkhir: 26000000,
            anggotaAktif: 120,
            totalAnggota: 150,
            anggotaBaru: 5,
            anggotaKeluar: 2,
            kpi: {
              rasioLikuiditas: { value: 2.4, status: 'SEHAT' },
              rasioKreditAktif: { value: 0.8, status: 'TINGGI' },
              rasioPembayaranLancar: { value: 0.07, status: 'MONITORING' },
              pertumbuhanAnggota: { value: 0.02, status: 'INFO' },
              netCashflow: { value: -7000000, status: 'DEFISIT' },
            },
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanBulanan(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanBulanan(query.bulan, query.tahun);
  }

  @Get('transaksi')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan transaksi lengkap' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan transaksi berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan transaksi',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            totalTransaksi: 120,
            breakdown: {
              SETORAN: { jumlahTransaksi: 60, totalNominal: 12000000 },
              PENARIKAN: { jumlahTransaksi: 20, totalNominal: 2500000 },
              PENCAIRAN: { jumlahTransaksi: 5, totalNominal: 20000000 },
              ANGSURAN: { jumlahTransaksi: 35, totalNominal: 3500000 },
            },
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanTransaksi(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanTransaksi(query.bulan, query.tahun);
  }

  @Get('angsuran')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan angsuran' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan angsuran berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan angsuran',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            summary: {
              totalAngsuranMasuk: 3500000,
              jumlahTransaksi: 35,
              rataRataAngsuran: 100000,
            },
            metrics: {
              rasioPembayaranLancar: 0.22,
              coverageTerhadapPencairan: 1.4,
              rataRataPerPeminjam: 437500,
            },
            insight: {
              interpretasiKredit:
                'Pembayaran stabil dan mampu menutup pencairan bulan ini',
              risikoKredit: 'Rendah',
            },
            kpiStatus: 'SEHAT',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanAngsuran(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanAngsuran(query.bulan, query.tahun);
  }

  @Get('penarikan')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan penarikan' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan penarikan berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan penarikan',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            summary: {
              totalPenarikan: 2500000,
              jumlahTransaksi: 20,
              rataRataPenarikan: 125000,
            },
            metrics: {
              rasioTerhadapSimpanan: 0.18,
              growthDariBulanLalu: 0.12,
              konsentrasiTop3: 0.46,
            },
            insight: {
              interpretasiLikuiditas: 'Penarikan masih dalam batas aman',
              tren: 'Mengalami kenaikan 12% dari bulan lalu',
            },
            kpiStatus: 'AMAN',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanPenarikan(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanPenarikan(query.bulan, query.tahun);
  }

  @Get('pinjaman')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan pinjaman' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan pinjaman berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan pinjaman',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            summary: {
              totalPinjamanAktif: 8,
              totalOutstanding: 20000000,
              pinjamanBaru: 3,
            },
            metrics: {
              rasioPinjamanTerhadapSimpanan: 0.72,
              konsentrasiTop5: 0.55,
              rataRataOutstanding: 2500000,
            },
            insight: {
              ekspansiKredit: 'Masih dalam batas sehat',
              risikoKonsentrasi: 'Sedang',
            },
            kpiStatus: 'STABIL',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanPinjaman(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanPinjaman(query.bulan, query.tahun);
  }

  @Get('simpanan')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan simpanan' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan simpanan berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan simpanan',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            summary: {
              totalSimpanan: 17000000,
              simpananPokok: 8000000,
              simpananWajib: 6000000,
              simpananSukarela: 3000000,
            },
            metrics: {
              growthSimpanan: 0.08,
              rasioSukarela: 0.17,
              rataRataSaldoAnggota: 850000,
            },
            insight: {
              pertumbuhanDana: 'Simpanan tumbuh 8% dari bulan lalu',
              kepercayaanAnggota: 'Cukup baik',
            },
            kpiStatus: 'BERTUMBUH',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanSimpanan(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanSimpanan(query.bulan, query.tahun);
  }

  @Get('cashflow')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan cashflow' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan cashflow berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan cashflow',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            pemasukan: 15500000,
            pengeluaran: 22500000,
            surplus: -7000000,
            saldoAwal: 10000000,
            saldoAkhir: 3000000,
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanCashflow(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanCashflow(query.bulan, query.tahun);
  }

  @Get('anggota')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Laporan anggota' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan anggota berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan anggota',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            totalTerdaftar: 150,
            anggotaAktif: 120,
            anggotaBaru: 5,
            anggotaKeluar: 2,
            anggotaDenganPinjamanAktif: 8,
            tidakAktifLebih3Bulan: 10,
            tanpaTransaksiLebih2Bulan: 15,
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanAnggota(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanAnggota(query.bulan, query.tahun);
  }

  @Post('keuangan/generate')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.generate')
  @ApiOperation({ summary: 'Generate laporan keuangan (snapshot)' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 201,
    description: 'Laporan keuangan berhasil di-generate',
    content: {
      'application/json': {
        example: {
          message: 'Laporan keuangan berhasil di-generate',
          data: {
            id: 1,
            periodeBulan: 2,
            periodeTahun: 2026,
            totalSimpanan: 12000000,
            totalPenarikan: 2500000,
            totalPinjaman: 20000000,
            totalAngsuran: 3500000,
            saldoAkhir: 26000000,
            statusLaporan: 'DRAFT',
            generatedById: 1,
            generatedAt: '2026-02-11T08:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  generateLaporanKeuangan(
    @Query() query: LaporanPeriodDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.laporanService.generateLaporanKeuangan(
      query.bulan,
      query.tahun,
      user.userId,
    );
  }

  @Get('keuangan')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.read')
  @ApiOperation({ summary: 'Lihat laporan keuangan (snapshot)' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Laporan keuangan berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil laporan keuangan',
          data: {
            id: 1,
            periodeBulan: 2,
            periodeTahun: 2026,
            totalSimpanan: 12000000,
            totalPenarikan: 2500000,
            totalPinjaman: 20000000,
            totalAngsuran: 3500000,
            saldoAkhir: 26000000,
            statusLaporan: 'DRAFT',
            generatedById: 1,
            generatedAt: '2026-02-11T08:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getLaporanKeuangan(@Query() query: LaporanPeriodDto) {
    return this.laporanService.getLaporanKeuangan(query.bulan, query.tahun);
  }

  @Post('keuangan/:id/finalize')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('laporan.finalize')
  @ApiOperation({ summary: 'Finalisasi laporan keuangan (snapshot)' })
  @ApiResponse({
    status: 200,
    description: 'Laporan keuangan berhasil difinalisasi',
    content: {
      'application/json': {
        example: {
          message: 'Laporan keuangan berhasil difinalisasi',
          data: {
            id: 1,
            periodeBulan: 2,
            periodeTahun: 2026,
            totalSimpanan: 12000000,
            totalPenarikan: 2500000,
            totalPinjaman: 20000000,
            totalAngsuran: 3500000,
            saldoAkhir: 26000000,
            statusLaporan: 'FINAL',
            generatedById: 1,
            generatedAt: '2026-02-11T08:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  finalizeLaporanKeuangan(@Param('id', ParseIntPipe) id: number) {
    return this.laporanService.finalizeLaporanKeuangan(id);
  }
}
