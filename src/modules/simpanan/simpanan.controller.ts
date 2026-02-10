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
import { SimpananService } from './simpanan.service';
import { SimpananTransaksiDto } from './dto';
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

@ApiTags('simpanan')
@Controller('simpanan')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SimpananController {
  constructor(private readonly simpananService: SimpananService) {}

  @Get('nasabah/:nasabahId')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Pimpinan', 'Kasir')
  @Permissions('simpanan.read')
  @ApiOperation({ summary: 'Dapatkan rekening simpanan nasabah' })
  @ApiResponse({
    status: 200,
    description: 'Rekening simpanan berhasil diambil',
  })
  @ApiNotFoundExample('Nasabah tidak ditemukan')
  @ApiAuthErrors()
  listRekeningByNasabah(@Param('nasabahId', ParseIntPipe) nasabahId: number) {
    return this.simpananService.listRekeningByNasabah(nasabahId);
  }

  @Get('rekening/:id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Pimpinan', 'Kasir')
  @Permissions('simpanan.read')
  @ApiOperation({ summary: 'Dapatkan detail rekening simpanan' })
  @ApiResponse({
    status: 200,
    description: 'Detail rekening simpanan berhasil diambil',
  })
  @ApiNotFoundExample('Rekening simpanan tidak ditemukan')
  @ApiAuthErrors()
  getRekeningById(@Param('id', ParseIntPipe) id: number) {
    return this.simpananService.getRekeningById(id);
  }

  @Post('rekening/:id/setoran')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Kasir')
  @Permissions('simpanan.setor')
  @ApiOperation({
    summary: 'Catat setoran simpanan (AUTO PROCESS)',
    description:
      'Transaksi setoran langsung diproses oleh backend hingga APPROVED/REJECTED.',
  })
  @ApiBody({ type: SimpananTransaksiDto })
  @ApiResponse({
    status: 201,
    description: 'Setoran simpanan berhasil dicatat',
  })
  @ApiBadRequestExample('Saldo simpanan tidak mencukupi')
  @ApiNotFoundExample('Rekening simpanan tidak ditemukan')
  @ApiAuthErrors()
  setoranSimpanan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SimpananTransaksiDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.simpananService.setoranSimpanan(id, dto, user.userId);
  }

  @Post('rekening/:id/penarikan')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Kasir')
  @Permissions('simpanan.tarik')
  @ApiOperation({
    summary: 'Catat penarikan simpanan (AUTO PROCESS)',
    description:
      'Transaksi penarikan langsung diproses oleh backend hingga APPROVED/REJECTED.',
  })
  @ApiBody({ type: SimpananTransaksiDto })
  @ApiResponse({
    status: 201,
    description: 'Penarikan simpanan berhasil dicatat',
  })
  @ApiBadRequestExample('Saldo simpanan tidak mencukupi')
  @ApiNotFoundExample('Rekening simpanan tidak ditemukan')
  @ApiAuthErrors()
  penarikanSimpanan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SimpananTransaksiDto,
    @CurrentUser() user: UserFromJwt,
  ) {
    return this.simpananService.penarikanSimpanan(id, dto, user.userId);
  }

  @Get('rekening/:id/transaksi')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin', 'Staff', 'Pimpinan', 'Kasir')
  @Permissions('simpanan.read')
  @ApiOperation({ summary: 'Histori transaksi simpanan' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'ID terakhir dari halaman sebelumnya (cursor). Kosongkan untuk halaman pertama.',
  })
  @ApiResponse({
    status: 200,
    description: 'Histori transaksi simpanan berhasil diambil',
  })
  @ApiNotFoundExample('Rekening simpanan tidak ditemukan')
  @ApiAuthErrors()
  listTransaksiByRekening(
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
  ) {
    return this.simpananService.listTransaksiByRekening(id, cursor);
  }
}
