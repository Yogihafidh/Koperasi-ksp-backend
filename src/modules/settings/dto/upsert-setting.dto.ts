import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  SETTING_VALUE_TYPE,
  type SettingValueType,
} from '../constants/settings.constants';

export class UpsertSettingDto {
  @ApiProperty({
    description: 'Nilai setting dalam format string',
    example: '24',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    description: 'Tipe nilai setting',
    enum: SETTING_VALUE_TYPE,
    example: SETTING_VALUE_TYPE.NUMBER,
  })
  @IsEnum(SETTING_VALUE_TYPE)
  valueType: SettingValueType;

  @ApiPropertyOptional({
    description: 'Deskripsi setting',
    example: 'Maksimum tenor pinjaman dalam bulan',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
