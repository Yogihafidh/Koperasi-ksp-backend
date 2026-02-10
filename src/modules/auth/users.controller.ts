import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AssignRolesDto, UpdateUserDto } from './dto';
import { Roles, Permissions } from '../../common/decorators';
import {
  ApiAuthErrors,
  ApiBadRequestExample,
  ApiNotFoundExample,
} from '../../common/decorators/api-docs.decorator';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
} from '../../common/guards';
import type { Request } from 'express';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  // ==================== USER MANAGEMENT ENDPOINTS ====================
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('user.update')
  @ApiOperation({ summary: 'Update data pengguna (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Data pengguna berhasil diupdate',
    content: {
      'application/json': {
        example: {
          message: 'Data user berhasil diubah',
          data: {
            id: 2,
            username: 'kasir1',
            email: 'kasir1@koperasi.com',
            isActive: true,
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Data tidak valid')
  @ApiAuthErrors()
  @ApiNotFoundExample('User tidak ditemukan')
  updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(userId, updateUserDto);
  }

  // ==================== USER-ROLE ASSIGNMENT ENDPOINTS ====================
  @Post(':id/roles')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('user.update')
  @ApiOperation({ summary: 'Assign roles ke user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Roles berhasil di-assign ke user',
    content: {
      'application/json': {
        example: {
          message: 'Role berhasil di-assign ke user',
        },
      },
    },
  })
  @ApiBadRequestExample('Data tidak valid')
  @ApiAuthErrors()
  @ApiNotFoundExample('User tidak ditemukan')
  assignRolesToUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignRolesDto: AssignRolesDto,
    @Req() request: Request,
  ) {
    return this.authService.assignRolesToUser(id, assignRolesDto, request.ip);
  }

  @Delete(':userId/roles/:roleId')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('user.update')
  @ApiOperation({ summary: 'Hapus role dari user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Role berhasil dihapus dari user',
    content: {
      'application/json': {
        example: {
          message: 'Role berhasil dihapus dari user',
        },
      },
    },
  })
  @ApiAuthErrors()
  @ApiNotFoundExample('User atau role tidak ditemukan')
  removeRoleFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Req() request: Request,
  ) {
    return this.authService.removeRoleFromUser(userId, roleId, request.ip);
  }

  @Get(':id/roles')
  @ApiBearerAuth('JWT-auth')
  @Roles('Admin')
  @Permissions('user.read')
  @ApiOperation({ summary: 'Dapatkan roles dari user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Daftar roles user berhasil diambil',
    content: {
      'application/json': {
        example: {
          message: 'Berhasil mengambil role user',
          data: [
            {
              id: 1,
              name: 'Admin',
              description: 'Administrator dengan akses penuh',
            },
            {
              id: 2,
              name: 'Kasir',
              description: 'Kasir yang menangani transaksi harian',
            },
          ],
        },
      },
    },
  })
  @ApiAuthErrors()
  @ApiNotFoundExample('User tidak ditemukan')
  getUserRoles(@Param('id', ParseIntPipe) id: number) {
    return this.authService.getUserRoles(id);
  }
}
