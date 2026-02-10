import {
  Body,
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
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JenisTransaksi, StatusTransaksi } from '@prisma/client';
import { TransaksiService } from './transaksi.service';
import { CreateTransaksiDto } from './dto';
import { CurrentUser, Permissions, Roles } from '../../common/decorators';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
} from '../../common/guards';
import {
  ApiAuthErrors,
  ApiBadRequestExample,
  ApiNotFoundExample,
} from '../../common/decorators/api-docs.decorator';
import type { UserFromJwt } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('transaksi')
@Controller('transaksi')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TransaksiController {
  constructor(private readonly transaksiService: TransaksiService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Kasir')
  @Permissions('transaksi.create')
  @ApiOperation({
    summary: 'Buat transaksi baru (AUTO PROCESS)',
    description:
      'Mencatat transaksi setelah validasi bisnis lalu langsung diproses hingga APPROVED/REJECTED.',
  })
  @ApiBody({
    description:
      'Isi data transaksi. Gunakan rekeningSimpananId untuk SETORAN/PENARIKAN, pinjamanId untuk PENCAIRAN/ANGSURAN.',
    type: CreateTransaksiDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Transaksi berhasil dicatat',
    content: {
      'application/json': {
        example: {
          message: 'Transaksi berhasil diproses',
          data: {
            id: 1,
            nasabahId: 1,
            pegawaiId: 2,
            rekeningSimpananId: 10,
            jenisTransaksi: 'SETORAN',
            statusTransaksi: 'APPROVED',
            nominal: 150000,
            metodePembayaran: 'TRANSFER',
            tanggal: '2026-02-09T10:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Data transaksi tidak valid')
  @ApiNotFoundExample('Nasabah tidak ditemukan')
  @ApiAuthErrors()
  createTransaksi(
    @Body() dto: CreateTransaksiDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.transaksiService.createTransaksi(dto, user.userId);
  }

  @Post(':id/process')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.process')
  @ApiOperation({
    summary: 'Proses transaksi (APPROVED/REJECTED)',
    description:
      'Diproses otomatis oleh backend. Status hanya boleh berubah dari PENDING ke APPROVED/REJECTED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil diproses',
    content: {
      'application/json': {
        example: {
          message: 'Transaksi berhasil diproses',
          data: {
            id: 1,
            statusTransaksi: 'APPROVED',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaksi ditolak',
    content: {
      'application/json': {
        example: {
          message: 'Transaksi ditolak',
          data: {
            id: 1,
            statusTransaksi: 'REJECTED',
            catatan: 'Saldo simpanan tidak mencukupi',
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Transaksi sudah diproses')
  @ApiNotFoundExample('Transaksi tidak ditemukan')
  @ApiAuthErrors()
  processTransaksi(@Param('id', ParseIntPipe) id: number) {
    return this.transaksiService.processTransaksi(id);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Dapatkan daftar transaksi',
    description:
      'Mendukung cursor pagination dan filter status, jenis, serta rentang tanggal.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiQuery({
    name: 'statusTransaksi',
    required: false,
    enum: StatusTransaksi,
    description: 'Filter status transaksi',
  })
  @ApiQuery({
    name: 'jenisTransaksi',
    required: false,
    enum: JenisTransaksi,
    description: 'Filter jenis transaksi',
  })
  @ApiQuery({
    name: 'tanggalFrom',
    required: false,
    description: 'Filter tanggal mulai (ISO string)',
  })
  @ApiQuery({
    name: 'tanggalTo',
    required: false,
    description: 'Filter tanggal akhir (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil data transaksi',
          data: [
            {
              id: 12,
              nasabahId: 1,
              pegawaiId: 2,
              rekeningSimpananId: 10,
              jenisTransaksi: 'SETORAN',
              statusTransaksi: 'APPROVED',
              nominal: 150000,
              tanggal: '2026-02-09T10:00:00.000Z',
              metodePembayaran: 'TRANSFER',
            },
          ],
          pagination: {
            nextCursor: null,
            limit: 20,
            hasNext: false,
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  listTransaksi(
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
    @Query('statusTransaksi') statusTransaksi?: StatusTransaksi,
    @Query('jenisTransaksi') jenisTransaksi?: JenisTransaksi,
    @Query('tanggalFrom') tanggalFrom?: string,
    @Query('tanggalTo') tanggalTo?: string,
  ) {
    return this.transaksiService.listTransaksi({
      cursor,
      statusTransaksi,
      jenisTransaksi,
      tanggalFrom,
      tanggalTo,
    });
  }

  @Get('nasabah/:nasabahId')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan', 'Staff', 'Kasir')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Dapatkan transaksi per nasabah',
    description: 'Histori transaksi milik nasabah tertentu.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi nasabah berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil data transaksi nasabah',
          data: [
            {
              id: 21,
              nasabahId: 1,
              jenisTransaksi: 'PENARIKAN',
              statusTransaksi: 'APPROVED',
              nominal: 50000,
              tanggal: '2026-02-09T12:00:00.000Z',
            },
          ],
          pagination: {
            nextCursor: null,
            limit: 20,
            hasNext: false,
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  listTransaksiByNasabah(
    @Param('nasabahId', ParseIntPipe) nasabahId: number,
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
  ) {
    return this.transaksiService.listTransaksiByNasabah(nasabahId, cursor);
  }

  @Get('pegawai/:pegawaiId')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Dapatkan transaksi per pegawai',
    description: 'Histori transaksi yang dicatat oleh pegawai tertentu.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi pegawai berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil data transaksi pegawai',
          data: [
            {
              id: 30,
              pegawaiId: 2,
              jenisTransaksi: 'SETORAN',
              statusTransaksi: 'PENDING',
              nominal: 200000,
              tanggal: '2026-02-09T13:00:00.000Z',
            },
          ],
          pagination: {
            nextCursor: null,
            limit: 20,
            hasNext: false,
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  listTransaksiByPegawai(
    @Param('pegawaiId', ParseIntPipe) pegawaiId: number,
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
  ) {
    return this.transaksiService.listTransaksiByPegawai(pegawaiId, cursor);
  }

  @Get('pending')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Dapatkan transaksi pending',
    description: 'Daftar transaksi yang belum diproses sistem.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi pending berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil transaksi pending',
          data: [
            {
              id: 41,
              statusTransaksi: 'PENDING',
              jenisTransaksi: 'ANGSURAN',
              nominal: 300000,
            },
          ],
          pagination: {
            nextCursor: null,
            limit: 20,
            hasNext: false,
          },
        },
      },
    },
  })
  @ApiAuthErrors()
  listTransaksiPending(
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
  ) {
    return this.transaksiService.listTransaksiPending(cursor);
  }

  @Get('export')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Export data transaksi',
    description:
      'Mengembalikan data transaksi untuk kebutuhan export. Output masih JSON.',
  })
  @ApiQuery({
    name: 'statusTransaksi',
    required: false,
    enum: StatusTransaksi,
    description: 'Filter status transaksi',
  })
  @ApiQuery({
    name: 'jenisTransaksi',
    required: false,
    enum: JenisTransaksi,
    description: 'Filter jenis transaksi',
  })
  @ApiQuery({
    name: 'tanggalFrom',
    required: false,
    description: 'Filter tanggal mulai (ISO string)',
  })
  @ApiQuery({
    name: 'tanggalTo',
    required: false,
    description: 'Filter tanggal akhir (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Export transaksi berhasil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil menyiapkan data export transaksi',
          data: [
            {
              id: 100,
              jenisTransaksi: 'SETORAN',
              statusTransaksi: 'APPROVED',
              nominal: 150000,
              tanggal: '2026-02-09T10:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiAuthErrors()
  exportTransaksi(
    @Query('statusTransaksi') statusTransaksi?: StatusTransaksi,
    @Query('jenisTransaksi') jenisTransaksi?: JenisTransaksi,
    @Query('tanggalFrom') tanggalFrom?: string,
    @Query('tanggalTo') tanggalTo?: string,
  ) {
    return this.transaksiService.exportTransaksi({
      statusTransaksi,
      jenisTransaksi,
      tanggalFrom,
      tanggalTo,
    });
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan', 'Staff', 'Kasir')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Dapatkan detail transaksi',
    description:
      'Detail lengkap transaksi termasuk relasi nasabah dan pegawai.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail transaksi berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil detail transaksi',
          data: {
            id: 1,
            nasabahId: 1,
            pegawaiId: 2,
            jenisTransaksi: 'SETORAN',
            statusTransaksi: 'APPROVED',
            nominal: 150000,
            tanggal: '2026-02-09T10:00:00.000Z',
            metodePembayaran: 'TRANSFER',
          },
        },
      },
    },
  })
  @ApiNotFoundExample('Transaksi tidak ditemukan')
  @ApiAuthErrors()
  getTransaksiById(@Param('id', ParseIntPipe) id: number) {
    return this.transaksiService.getTransaksiById(id);
  }
}
