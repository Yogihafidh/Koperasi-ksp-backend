import {
  Body,
  Controller,
  Delete,
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
import { JenisTransaksi } from '@prisma/client';
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
    summary: 'Buat transaksi baru',
    description:
      'Mencatat transaksi setelah validasi bisnis, update saldo/pinjaman, lalu menyimpan histori transaksi yang berhasil.',
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

  @Get()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.read')
  @ApiOperation({
    summary: 'Dapatkan daftar transaksi',
    description:
      'Mendukung cursor pagination dan filter jenis serta rentang tanggal.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
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
    @Query('jenisTransaksi') jenisTransaksi?: JenisTransaksi,
    @Query('tanggalFrom') tanggalFrom?: string,
    @Query('tanggalTo') tanggalTo?: string,
  ) {
    return this.transaksiService.listTransaksi({
      cursor,
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
    @Query('jenisTransaksi') jenisTransaksi?: JenisTransaksi,
    @Query('tanggalFrom') tanggalFrom?: string,
    @Query('tanggalTo') tanggalTo?: string,
  ) {
    return this.transaksiService.exportTransaksi({
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

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('transaksi.process')
  @ApiOperation({
    summary: 'Soft delete transaksi',
    description:
      'Menandai transaksi sebagai terhapus dengan mengisi deletedAt.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaksi berhasil dihapus (soft delete)',
  })
  @ApiNotFoundExample('Transaksi tidak ditemukan')
  @ApiAuthErrors()
  softDeleteTransaksi(@Param('id', ParseIntPipe) id: number) {
    return this.transaksiService.softDeleteTransaksi(id);
  }
}
