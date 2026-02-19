import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { SettingValueType } from './constants/settings.constants';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listSettings() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  findByKey(key: string) {
    return this.prisma.setting.findUnique({
      where: { key },
    });
  }

  upsertSetting(args: {
    key: string;
    value: string;
    valueType: SettingValueType;
    description?: string;
  }) {
    const payload = {
      value: args.value,
      valueType: args.valueType,
      description: args.description,
    };

    return this.prisma.setting.upsert({
      where: { key: args.key },
      update: payload as never,
      create: {
        key: args.key,
        ...(payload as Record<string, unknown>),
      } as never,
    });
  }
}
