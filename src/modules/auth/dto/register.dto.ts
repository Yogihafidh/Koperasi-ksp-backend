import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Username untuk login',
    example: 'johndoe',
    minLength: 3,
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  @IsString({ message: 'Username harus berupa string' })
  @MinLength(3, { message: 'Username minimal 3 karakter' })
  @MaxLength(50, { message: 'Username maksimal 50 karakter' })
  username: string;

  @ApiProperty({
    description: 'Alamat email pengguna',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @ApiProperty({
    description:
      'Password harus minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, dan angka/simbol',
    example: 'Password123!',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString({ message: 'Password harus berupa string' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password harus mengandung huruf besar, huruf kecil, dan angka/simbol',
  })
  password: string;

  @ApiProperty({
    description: 'Nama lengkap pengguna',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Nama lengkap tidak boleh kosong' })
  @IsString({ message: 'Nama lengkap harus berupa string' })
  @MaxLength(100, { message: 'Nama lengkap maksimal 100 karakter' })
  fullName: string;
}
