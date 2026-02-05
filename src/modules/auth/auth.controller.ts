import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto';
import { Public, CurrentUser } from '../../common/decorators';
import {
  ApiAuthErrors,
  ApiBadRequestExample,
  ApiConflictExample,
  ApiForbiddenExample,
  ApiUnauthorizedExample,
} from '../../common/decorators/api-docs.decorator';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
} from '../../common/guards';
import type { UserFromJwt } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== AUTHENTICATION ENDPOINTS ====================
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register pengguna baru' })
  @ApiResponse({
    status: 201,
    description: 'Pengguna berhasil didaftarkan',
    content: {
      'application/json': {
        example: {
          message: 'Registrasi berhasil',
          user: {
            id: 1,
            username: 'johndoe',
            email: 'john.doe@example.com',
            isActive: true,
            createdAt: '2026-02-05T10:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiBadRequestExample('Data tidak valid')
  @ApiConflictExample('Username atau email sudah terdaftar')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil, mengembalikan access token dan refresh token',
    content: {
      'application/json': {
        example: {
          message: 'Login berhasil',
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@koperasi.com',
            roles: ['Admin'],
            permissions: ['user.read', 'role.read'],
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiUnauthorizedExample('Username/email atau password salah')
  @ApiForbiddenExample('Akun tidak aktif')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mendapatkan profil pengguna yang sedang login' })
  @ApiResponse({
    status: 200,
    description: 'Profil pengguna berhasil diambil',
    content: {
      'application/json': {
        example: {
          id: 1,
          username: 'admin',
          email: 'admin@koperasi.com',
          isActive: true,
          lastLoginAt: '2026-02-05T09:50:00.000Z',
          createdAt: '2026-01-20T08:00:00.000Z',
          roles: ['Admin'],
          permissions: ['user.read', 'role.read'],
        },
      },
    },
  })
  @ApiAuthErrors()
  getProfile(@CurrentUser() user: UserFromJwt) {
    return this.authService.getProfile(user.userId);
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Ubah password pengguna yang sedang login' })
  @ApiResponse({
    status: 200,
    description: 'Password berhasil diubah',
    content: {
      'application/json': {
        example: {
          message: 'Password berhasil diubah',
        },
      },
    },
  })
  @ApiBadRequestExample(
    'Password lama salah atau konfirmasi password tidak cocok',
  )
  @ApiAuthErrors()
  changePassword(
    @CurrentUser() user: UserFromJwt,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, changePasswordDto);
  }

  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token berhasil di-refresh',
    content: {
      'application/json': {
        example: {
          message: 'Token berhasil diperbarui',
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiAuthErrors()
  refreshToken(@CurrentUser() user: UserFromJwt) {
    return this.authService.refreshToken(user.userId);
  }
}
