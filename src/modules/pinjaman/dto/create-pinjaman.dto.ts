import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePinjamanDto {
  @ApiProperty({
    description: 'ID nasabah',
    example: 1,
  })
  @IsInt()
  nasabahId: number;

  @ApiProperty({
    description: 'Jumlah pinjaman',
    example: 5000000,
  })
  @IsNumber()
  @Min(0.01)
  jumlahPinjaman: number;

  @ApiPropertyOptional({
    description: 'Bunga pinjaman dalam persen',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bungaPersen?: number;

  @ApiProperty({
    description: 'Tenor pinjaman dalam bulan',
    example: 12,
  })
  @IsInt()
  @Min(1)
  tenorBulan: number;
}
