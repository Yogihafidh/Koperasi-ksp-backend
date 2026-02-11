import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class LaporanPeriodDto {
  @ApiProperty({
    description: 'Bulan laporan (1-12)',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan: number;

  @ApiProperty({
    description: 'Tahun laporan (YYYY)',
    example: 2026,
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  tahun: number;
}
