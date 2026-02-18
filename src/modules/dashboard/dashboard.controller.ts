import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardPeriodDto } from './dto';
import { Permissions, Roles } from '../../common/decorators';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../common/guards';
import { ApiAuthErrors } from '../../common/decorators/api-docs.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Kasir', 'Pimpinan')
  @Permissions('dashboard.read')
  @ApiOperation({ summary: 'Ringkasan dashboard koperasi' })
  @ApiQuery({ name: 'bulan', required: true })
  @ApiQuery({ name: 'tahun', required: true })
  @ApiResponse({
    status: 200,
    description: 'Dashboard berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil data dashboard',
          data: {
            periode: { bulan: 2, tahun: 2026 },
            ringkasanKeuangan: {
              totalSimpanan: 17000000,
              totalOutstandingPinjaman: 20000000,
              angsuranBulanIni: 3500000,
              penarikanBulanIni: 2500000,
              growthSimpanan: 0.08,
              komposisiSimpanan: {
                POKOK: 8000000,
                WAJIB: 6000000,
                SUKARELA: 3000000,
              },
            },
            aktivitasTransaksi: {
              cashflowTrend: [
                { bulan: 'Sep 2025', kasMasuk: 5000000, kasKeluar: 3000000 },
                { bulan: 'Okt 2025', kasMasuk: 6000000, kasKeluar: 4000000 },
                { bulan: 'Nov 2025', kasMasuk: 5500000, kasKeluar: 3500000 },
                { bulan: 'Des 2025', kasMasuk: 6200000, kasKeluar: 4200000 },
                { bulan: 'Jan 2026', kasMasuk: 5800000, kasKeluar: 3900000 },
                { bulan: 'Feb 2026', kasMasuk: 7000000, kasKeluar: 4500000 },
              ],
            },
            kreditPinjaman: {
              topOutstanding: [
                { pinjamanId: 1, nominal: 7000000 },
                { pinjamanId: 2, nominal: 5000000 },
                { pinjamanId: 3, nominal: 4000000 },
                { pinjamanId: 4, nominal: 3000000 },
                { pinjamanId: 5, nominal: 1000000 },
              ],
            },
            keanggotaan: {
              totalAnggota: 150,
              anggotaAktif: 120,
              trenAnggota: [
                { bulan: 'Sep 2025', anggotaBaru: 5, anggotaKeluar: 2 },
                { bulan: 'Okt 2025', anggotaBaru: 4, anggotaKeluar: 1 },
                { bulan: 'Nov 2025', anggotaBaru: 6, anggotaKeluar: 3 },
                { bulan: 'Des 2025', anggotaBaru: 3, anggotaKeluar: 2 },
                { bulan: 'Jan 2026', anggotaBaru: 5, anggotaKeluar: 1 },
                { bulan: 'Feb 2026', anggotaBaru: 5, anggotaKeluar: 2 },
              ],
            },
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  getDashboard(@Query() query: DashboardPeriodDto) {
    return this.dashboardService.getDashboard(query.bulan, query.tahun);
  }
}
