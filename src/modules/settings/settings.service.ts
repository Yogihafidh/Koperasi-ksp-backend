import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { UpsertSettingDto } from './dto';
import { SettingsRepository } from './settings.repository';
import {
  SETTING_VALUE_TYPE,
  type SettingValueType,
} from './constants/settings.constants';

type SettingEntity = {
  id: number;
  key: string;
  value: string;
  valueType: SettingValueType;
  description: string | null;
  updatedAt: Date;
};

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly cache = new Map<string, SettingEntity>();

  constructor(private readonly settingsRepository: SettingsRepository) {}

  async onModuleInit() {
    await this.reloadCache();
  }

  private validateByType(value: string, valueType: SettingValueType) {
    if (valueType === SETTING_VALUE_TYPE.NUMBER) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new BadRequestException('Value harus berupa angka valid');
      }
      return;
    }

    if (valueType === SETTING_VALUE_TYPE.BOOLEAN) {
      const normalized = value.toLowerCase();
      if (!['true', 'false', '1', '0'].includes(normalized)) {
        throw new BadRequestException(
          'Value boolean harus bernilai true/false/1/0',
        );
      }
      return;
    }

    if (valueType === SETTING_VALUE_TYPE.JSON) {
      try {
        JSON.parse(value);
      } catch {
        throw new BadRequestException('Value JSON tidak valid');
      }
    }
  }

  async reloadCache() {
    const settings = (await this.settingsRepository.listSettings()) as Array<
      Record<string, unknown>
    >;
    this.cache.clear();
    for (const item of settings) {
      const normalized: SettingEntity = {
        id: Number(item.id),
        key: String(item.key),
        value: String(item.value),
        valueType:
          (item.valueType as SettingValueType | undefined) ??
          SETTING_VALUE_TYPE.STRING,
        description:
          typeof item.description === 'string' ? item.description : null,
        updatedAt: new Date(item.updatedAt as Date | string),
      };
      this.cache.set(normalized.key, normalized);
    }
  }

  async listSettings() {
    if (this.cache.size === 0) {
      await this.reloadCache();
    }
    const data = Array.from(this.cache.values()).sort((a, b) =>
      a.key.localeCompare(b.key),
    );

    return {
      message: 'Berhasil mengambil daftar settings',
      data,
    };
  }

  async getSetting(key: string) {
    if (!this.cache.has(key)) {
      await this.reloadCache();
    }

    const setting = this.cache.get(key);
    if (!setting) {
      throw new NotFoundException(`Setting ${key} tidak ditemukan`);
    }

    return {
      message: 'Berhasil mengambil detail setting',
      data: setting,
    };
  }

  async upsertSetting(key: string, dto: UpsertSettingDto) {
    this.validateByType(dto.value, dto.valueType);

    const updated = await this.settingsRepository.upsertSetting({
      key,
      value: dto.value,
      valueType: dto.valueType,
      description: dto.description,
    });

    await this.reloadCache();
    return {
      message: 'Setting berhasil disimpan',
      data: updated,
    };
  }

  async getNumber(key: string) {
    const setting = await this.getSettingEntity(key);
    if (setting.valueType !== SETTING_VALUE_TYPE.NUMBER) {
      throw new BadRequestException(`Setting ${key} bukan bertipe NUMBER`);
    }

    const parsed = Number(setting.value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`Value setting ${key} bukan angka valid`);
    }

    return parsed;
  }

  async getBoolean(key: string) {
    const setting = await this.getSettingEntity(key);
    if (setting.valueType !== SETTING_VALUE_TYPE.BOOLEAN) {
      throw new BadRequestException(`Setting ${key} bukan bertipe BOOLEAN`);
    }

    const normalized = setting.value.toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }

    throw new BadRequestException(`Value setting ${key} bukan boolean valid`);
  }

  private async getSettingEntity(key: string) {
    if (!this.cache.has(key)) {
      await this.reloadCache();
    }

    const setting = this.cache.get(key);
    if (!setting) {
      throw new NotFoundException(`Setting ${key} tidak ditemukan`);
    }

    return setting;
  }
}
