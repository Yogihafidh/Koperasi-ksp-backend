import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { PinjamanService } from './pinjaman.service';
import {
  AngsuranPinjamanDto,
  CreatePinjamanDto,
  PencairanPinjamanDto,
  VerifikasiPinjamanDto,
} from './dto';
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

@ApiTags('pinjaman')
@Controller('pinjaman')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PinjamanController {
  constructor(private readonly pinjamanService: PinjamanService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff')
  @Permissions('pinjaman.ajukan')
  @ApiOperation({ summary: 'Pengajuan pinjaman' })
  @ApiBody({ type: CreatePinjamanDto })
  @ApiResponse({
    status: 201,
    description: 'Pengajuan pinjaman berhasil dibuat',
  })
  @ApiBadRequestExample('Nasabah tidak aktif')
  @ApiNotFoundExample('Nasabah tidak ditemukan')
  @ApiAuthErrors()
  createPinjaman(@Body() dto: CreatePinjamanDto) {
    return this.pinjamanService.createPinjaman(dto);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Pimpinan', 'Kasir')
  @Permissions('pinjaman.read')
  @ApiOperation({ summary: 'Dapatkan detail pinjaman' })
  @ApiResponse({
    status: 200,
    description: 'Detail pinjaman berhasil diambil',
  })
  @ApiNotFoundExample('Pinjaman tidak ditemukan')
  @ApiAuthErrors()
  getPinjamanById(@Param('id', ParseIntPipe) id: number) {
    return this.pinjamanService.getPinjamanById(id);
  }

  @Get('nasabah/:nasabahId')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Pimpinan', 'Kasir')
  @Permissions('pinjaman.read')
  @ApiOperation({ summary: 'Dapatkan pinjaman per nasabah' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar pinjaman nasabah berhasil diambil',
  })
  @ApiAuthErrors()
  listPinjamanByNasabah(
    @Param('nasabahId', ParseIntPipe) nasabahId: number,
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
  ) {
    return this.pinjamanService.listPinjamanByNasabah(nasabahId, cursor);
  }

  @Patch(':id/verifikasi')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Pimpinan')
  @Permissions('pinjaman.verify')
  @ApiOperation({ summary: 'Verifikasi pinjaman' })
  @ApiBody({ type: VerifikasiPinjamanDto })
  @ApiResponse({
    status: 200,
    description: 'Verifikasi pinjaman berhasil',
  })
  @ApiBadRequestExample('Status verifikasi tidak valid')
  @ApiNotFoundExample('Pinjaman tidak ditemukan')
  @ApiAuthErrors()
  verifikasiPinjaman(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifikasiPinjamanDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.pinjamanService.verifikasiPinjaman(id, dto, user.userId);
  }

  @Post(':id/pencairan')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Kasir')
  @Permissions('pinjaman.cairkan')
  @ApiOperation({
    summary: 'Catat pencairan pinjaman (AUTO PROCESS)',
    description:
      'Transaksi pencairan langsung diproses oleh backend hingga APPROVED/REJECTED.',
  })
  @ApiBody({ type: PencairanPinjamanDto })
  @ApiResponse({
    status: 201,
    description: 'Pencairan pinjaman berhasil dicatat',
  })
  @ApiBadRequestExample('Pencairan pinjaman sudah dibuat')
  @ApiNotFoundExample('Pinjaman tidak ditemukan')
  @ApiAuthErrors()
  pencairanPinjaman(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PencairanPinjamanDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.pinjamanService.pencairanPinjaman(id, dto, user.userId);
  }

  @Post(':id/angsuran')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Kasir')
  @Permissions('pinjaman.angsuran')
  @ApiOperation({
    summary: 'Catat angsuran pinjaman (AUTO PROCESS)',
    description:
      'Transaksi angsuran langsung diproses oleh backend hingga APPROVED/REJECTED.',
  })
  @ApiBody({ type: AngsuranPinjamanDto })
  @ApiResponse({
    status: 201,
    description: 'Angsuran pinjaman berhasil dicatat',
  })
  @ApiBadRequestExample('Nominal melebihi sisa pinjaman')
  @ApiNotFoundExample('Pinjaman tidak ditemukan')
  @ApiAuthErrors()
  angsuranPinjaman(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AngsuranPinjamanDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.pinjamanService.angsuranPinjaman(id, dto, user.userId);
  }

  @Get(':id/transaksi')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Pimpinan', 'Kasir')
  @Permissions('pinjaman.read')
  @ApiOperation({ summary: 'Histori transaksi pinjaman' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiResponse({
    status: 200,
    description: 'Histori transaksi pinjaman berhasil diambil',
  })
  @ApiNotFoundExample('Pinjaman tidak ditemukan')
  @ApiAuthErrors()
  listTransaksiByPinjaman(
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
  ) {
    return this.pinjamanService.listTransaksiByPinjaman(id, cursor);
  }
}
