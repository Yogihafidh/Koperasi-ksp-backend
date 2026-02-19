import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LaporanService } from './laporan.service';

@Injectable()
export class LaporanScheduler {
  private readonly logger = new Logger(LaporanScheduler.name);

  constructor(
    private readonly laporanService: LaporanService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 0 1 * * *')
  async generateSnapshotBeforeMonthEnd() {
    const daysBefore =
      this.configService.get<number>('app.snapshotDaysBeforeMonthEnd') ?? 3;
    const systemUserId =
      this.configService.get<number>('app.snapshotSystemUserId') ?? 1;

    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilEnd = lastDay.getDate() - now.getDate();

    if (daysUntilEnd !== daysBefore) {
      return;
    }

    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();

    try {
      await this.laporanService.generateLaporanKeuangan(
        bulan,
        tahun,
        systemUserId,
      );
      this.logger.log(
        `Snapshot laporan keuangan otomatis dibuat untuk ${bulan}/${tahun}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Gagal generate snapshot otomatis: ${reason}`);
    }
  }
}
