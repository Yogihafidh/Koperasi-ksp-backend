import { Injectable } from '@nestjs/common';
import {
  JenisSimpanan,
  JenisTransaksi,
  NasabahStatus,
  Prisma,
  StatusTransaksi,
} from '@prisma/client';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return value instanceof Prisma.Decimal ? value.toNumber() : Number(value);
  }

  private getMonthRange(bulan: number, tahun: number) {
    const start = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0);
    const end = new Date(tahun, bulan, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private shiftMonth(bulan: number, tahun: number, offset: number) {
    const date = new Date(tahun, bulan - 1, 1);
    date.setMonth(date.getMonth() + offset);
    return { bulan: date.getMonth() + 1, tahun: date.getFullYear() };
  }

  private calculateGrowth(current: number, previous: number) {
    if (previous <= 0) {
      return null;
    }
    return (current - previous) / previous;
  }

  private formatMonthLabel(bulan: number, tahun: number) {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return `${monthNames[bulan - 1]} ${tahun}`;
  }

  async getDashboard(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const snapshot =
      await this.dashboardRepository.findLaporanKeuanganByPeriode(bulan, tahun);

    const [
      totalSimpananAgg,
      totalOutstandingAgg,
      setoranAgg,
      penarikanAgg,
      angsuranAgg,
      saldoGrouped,
      topOutstanding,
      totalAnggota,
      anggotaAktif,
    ] = await Promise.all([
      this.dashboardRepository.sumSaldoSimpanan(),
      this.dashboardRepository.sumPinjamanAktifNominal(),
      this.dashboardRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.SETORAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.dashboardRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.PENARIKAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.dashboardRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.dashboardRepository.groupSaldoSimpananByJenis(),
      this.dashboardRepository.listTopOutstandingPinjaman(5),
      this.dashboardRepository.countNasabah({ deletedAt: null }),
      this.dashboardRepository.countNasabah({
        deletedAt: null,
        status: NasabahStatus.AKTIF,
      }),
    ]);

    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.saldoBerjalan);
    const totalOutstandingPinjaman = this.toNumber(
      totalOutstandingAgg._sum.sisaPinjaman,
    );

    const totalSetoran = snapshot
      ? this.toNumber(snapshot.totalSimpanan)
      : this.toNumber(setoranAgg._sum.nominal);
    const totalPenarikan = snapshot
      ? this.toNumber(snapshot.totalPenarikan)
      : this.toNumber(penarikanAgg._sum.nominal);
    const angsuranBulanIni = snapshot
      ? this.toNumber(snapshot.totalAngsuran)
      : this.toNumber(angsuranAgg._sum.nominal);

    const prevTotalSimpanan = totalSimpanan - (totalSetoran - totalPenarikan);
    const growthSimpanan = this.calculateGrowth(
      totalSimpanan,
      prevTotalSimpanan,
    );

    const komposisiSimpanan: Record<string, number> = {
      [JenisSimpanan.POKOK]: 0,
      [JenisSimpanan.WAJIB]: 0,
      [JenisSimpanan.SUKARELA]: 0,
    };
    for (const row of saldoGrouped) {
      komposisiSimpanan[row.jenisSimpanan] = this.toNumber(
        row._sum.saldoBerjalan,
      );
    }

    const monthRanges = Array.from({ length: 6 }, (_, index) => {
      const shifted = this.shiftMonth(bulan, tahun, -(5 - index));
      return {
        bulan: shifted.bulan,
        tahun: shifted.tahun,
        range: this.getMonthRange(shifted.bulan, shifted.tahun),
      };
    });

    const [cashflowTrend, trenAnggota] = await Promise.all([
      Promise.all(
        monthRanges.map(async (item) => {
          const [kasMasukAgg, kasKeluarAgg] = await Promise.all([
            this.dashboardRepository.sumTransaksiNominal({
              jenisTransaksi: [JenisTransaksi.SETORAN, JenisTransaksi.ANGSURAN],
              statusTransaksi: StatusTransaksi.APPROVED,
              tanggalFrom: item.range.start,
              tanggalTo: item.range.end,
            }),
            this.dashboardRepository.sumTransaksiNominal({
              jenisTransaksi: [
                JenisTransaksi.PENARIKAN,
                JenisTransaksi.PENCAIRAN,
              ],
              statusTransaksi: StatusTransaksi.APPROVED,
              tanggalFrom: item.range.start,
              tanggalTo: item.range.end,
            }),
          ]);

          return {
            bulan: this.formatMonthLabel(item.bulan, item.tahun),
            kasMasuk: this.toNumber(kasMasukAgg._sum.nominal),
            kasKeluar: this.toNumber(kasKeluarAgg._sum.nominal),
          };
        }),
      ),
      Promise.all(
        monthRanges.map(async (item) => {
          const [anggotaBaru, anggotaKeluar] = await Promise.all([
            this.dashboardRepository.countNasabah({
              deletedAt: null,
              createdAt: { gte: item.range.start, lte: item.range.end },
            }),
            this.dashboardRepository.countNasabah({
              deletedAt: null,
              status: NasabahStatus.NONAKTIF,
              updatedAt: { gte: item.range.start, lte: item.range.end },
            }),
          ]);

          return {
            bulan: this.formatMonthLabel(item.bulan, item.tahun),
            anggotaBaru,
            anggotaKeluar,
          };
        }),
      ),
    ]);

    const topOutstandingValues = topOutstanding.map((item) => ({
      pinjamanId: item.id,
      nominal: this.toNumber(item.sisaPinjaman),
    }));

    return {
      message: 'Berhasil mengambil data dashboard',
      data: {
        periode: { bulan, tahun },
        ringkasanKeuangan: {
          totalSimpanan,
          totalOutstandingPinjaman,
          angsuranBulanIni,
          penarikanBulanIni: totalPenarikan,
          growthSimpanan,
          komposisiSimpanan,
        },
        aktivitasTransaksi: {
          cashflowTrend,
        },
        kreditPinjaman: {
          topOutstanding: topOutstandingValues,
        },
        keanggotaan: {
          totalAnggota,
          anggotaAktif,
          trenAnggota,
        },
      },
    };
  }
}
