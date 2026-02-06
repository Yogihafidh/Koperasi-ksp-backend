import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PegawaiService } from './pegawai.service';
import {
  CreatePegawaiDto,
  UpdatePegawaiDto,
  TogglePegawaiStatusDto,
} from './dto';
import { Roles, Permissions } from '../../common/decorators';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
} from '../../common/guards';
import {
  ApiAuthErrors,
  ApiBadRequestExample,
  ApiConflictExample,
  ApiNotFoundExample,
} from '../../common/decorators/api-docs.decorator';

@ApiTags('pegawai')
@Controller('pegawai')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PegawaiController {
  constructor(private readonly pegawaiService: PegawaiService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('pegawai.create')
  @ApiOperation({ summary: 'Buat data pegawai' })
  @ApiResponse({
    status: 201,
    description: 'Pegawai berhasil dibuat',
    content: {
      'application/json': {
        example: {
          message: 'Pegawai berhasil dibuat',
          data: {
            id: 1,
            userId: 2,
            nama: 'Budi Santoso',
            jabatan: 'Kasir',
            noHp: '081234567890',
            alamat: 'Jl. Melati No. 10, Bandung',
            statusAktif: true,
            createdAt: '2026-02-05T10:00:00.000Z',
            user: {
              id: 2,
              username: 'kasir1',
              email: 'kasir1@koperasi.com',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Data tidak valid')
  @ApiConflictExample('User sudah terdaftar sebagai pegawai')
  @ApiNotFoundExample('User tidak ditemukan')
  @ApiAuthErrors()
  createPegawai(@Body() dto: CreatePegawaiDto) {
    return this.pegawaiService.createPegawai(dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('pegawai.read')
  @ApiOperation({ summary: 'Dapatkan semua pegawai' })
  @ApiResponse({
    status: 200,
    description: 'Daftar pegawai berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil data pegawai',
          data: [
            {
              id: 1,
              userId: 2,
              nama: 'Budi Santoso',
              jabatan: 'Kasir',
              noHp: '081234567890',
              alamat: 'Jl. Melati No. 10, Bandung',
              statusAktif: true,
              createdAt: '2026-02-05T10:00:00.000Z',
              user: {
                id: 2,
                username: 'kasir1',
                email: 'kasir1@koperasi.com',
              },
            },
          ],
        },
      },
    },
  })
  @ApiAuthErrors()
  getAllPegawai() {
    return this.pegawaiService.getAllPegawai();
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('pegawai.read')
  @ApiOperation({ summary: 'Dapatkan pegawai berdasarkan ID' })
  @ApiResponse({
    status: 200,
    description: 'Pegawai berhasil ditemukan',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil data pegawai',
          data: {
            id: 1,
            userId: 2,
            nama: 'Budi Santoso',
            jabatan: 'Kasir',
            noHp: '081234567890',
            alamat: 'Jl. Melati No. 10, Bandung',
            statusAktif: true,
            createdAt: '2026-02-05T10:00:00.000Z',
            user: {
              id: 2,
              username: 'kasir1',
              email: 'kasir1@koperasi.com',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundExample('Pegawai tidak ditemukan')
  @ApiAuthErrors()
  getPegawaiById(@Param('id', ParseIntPipe) id: number) {
    return this.pegawaiService.getPegawaiById(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('pegawai.update')
  @ApiOperation({ summary: 'Update data pegawai' })
  @ApiResponse({
    status: 200,
    description: 'Pegawai berhasil diperbarui',
    content: {
      'application/json': {
        example: {
          message: 'Pegawai berhasil diperbarui',
          data: {
            id: 1,
            userId: 2,
            nama: 'Budi Santoso',
            jabatan: 'Kasir Senior',
            noHp: '081234567890',
            alamat: 'Jl. Melati No. 10, Bandung',
            statusAktif: true,
            createdAt: '2026-02-05T10:00:00.000Z',
            user: {
              id: 2,
              username: 'kasir1',
              email: 'kasir1@koperasi.com',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Data tidak valid')
  @ApiNotFoundExample('Pegawai tidak ditemukan')
  @ApiAuthErrors()
  updatePegawai(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePegawaiDto,
  ) {
    return this.pegawaiService.updatePegawai(id, dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('pegawai.update')
  @ApiOperation({ summary: 'Aktifkan atau nonaktifkan pegawai' })
  @ApiResponse({
    status: 200,
    description: 'Status pegawai berhasil diperbarui',
    content: {
      'application/json': {
        example: {
          message: 'Status pegawai berhasil diperbarui',
          data: {
            id: 1,
            userId: 2,
            nama: 'Budi Santoso',
            jabatan: 'Kasir',
            noHp: '081234567890',
            alamat: 'Jl. Melati No. 10, Bandung',
            statusAktif: false,
            createdAt: '2026-02-05T10:00:00.000Z',
            user: {
              id: 2,
              username: 'kasir1',
              email: 'kasir1@koperasi.com',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Data tidak valid')
  @ApiNotFoundExample('Pegawai tidak ditemukan')
  @ApiAuthErrors()
  updatePegawaiStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TogglePegawaiStatusDto,
  ) {
    return this.pegawaiService.updatePegawaiStatus(id, dto);
  }
}
