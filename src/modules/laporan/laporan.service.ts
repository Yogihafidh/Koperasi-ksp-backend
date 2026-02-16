import { BadRequestException, Injectable } from '@nestjs/common';
import {
  JenisSimpanan,
  JenisTransaksi,
  NasabahStatus,
  Prisma,
  StatusLaporan,
  StatusTransaksi,
} from '@prisma/client';
import { LaporanRepository } from './laporan.repository';

@Injectable()
export class LaporanService {
  constructor(private readonly laporanRepository: LaporanRepository) {}

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

  private subtractMonths(date: Date, months: number) {
    const copy = new Date(date);
    copy.setMonth(copy.getMonth() - months);
    return copy;
  }

  private async getSaldoAwal(bulan: number, tahun: number) {
    const previous = await this.laporanRepository.findPreviousFinalLaporan(
      bulan,
      tahun,
    );
    return this.toNumber(previous?.saldoAkhir ?? 0);
  }

  private buildJenisMap<T>(keys: JenisTransaksi[], factory: () => T) {
    return keys.reduce<Record<string, T>>((acc, key) => {
      acc[key] = factory();
      return acc;
    }, {});
  }

  private safeDivide(numerator: number, denominator: number) {
    if (denominator <= 0) {
      return null;
    }
    return numerator / denominator;
  }

  private calculateGrowth(current: number, previous: number) {
    if (previous <= 0) {
      return null;
    }
    return (current - previous) / previous;
  }

  private formatGrowthText(growth: number | null) {
    if (growth === null) {
      return 'Belum ada data pembanding bulan lalu';
    }
    if (growth === 0) {
      return 'Stabil dibanding bulan lalu';
    }
    const percent = Math.abs(Math.round(growth * 100));
    if (growth > 0) {
      return `Mengalami kenaikan ${percent}% dari bulan lalu`;
    }
    return `Mengalami penurunan ${percent}% dari bulan lalu`;
  }

  private roundTo(value: number, decimals: number) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private shiftMonth(bulan: number, tahun: number, offset: number) {
    const date = new Date(tahun, bulan - 1, 1);
    date.setMonth(date.getMonth() + offset);
    return { bulan: date.getMonth() + 1, tahun: date.getFullYear() };
  }

  private getTransaksiTrend(
    current: number,
    prev: number,
    prev2: number,
  ): 'NAIK' | 'TURUN' | 'STABIL' {
    if (current > prev && prev > prev2) {
      return 'NAIK';
    }
    if (current < prev && prev < prev2) {
      return 'TURUN';
    }
    return 'STABIL';
  }

  private getLikuiditasRisk(value: number | null) {
    if (value === null) {
      return 'N/A';
    }
    if (value > 2) {
      return 'AMAN';
    }
    if (value >= 1) {
      return 'WASPADA';
    }
    return 'RISIKO';
  }

  private getEkspansiKreditRisk(value: number | null) {
    if (value === null) {
      return 'N/A';
    }
    if (value < 0.75) {
      return 'KURANG PRODUKTIF';
    }
    if (value <= 0.85) {
      return 'OPTIMAL';
    }
    if (value <= 0.95) {
      return 'WASPADA';
    }
    return 'RISIKO';
  }

  private getArusKasRisk(netCashflow: number) {
    if (netCashflow > 0) {
      return 'POSITIF';
    }
    if (netCashflow === 0) {
      return 'NETRAL';
    }
    return 'NEGATIF';
  }

  private getKetahananKasRisk(value: number | null) {
    if (value === null) {
      return 'N/A';
    }
    if (value < 1) {
      return 'RISIKO';
    }
    if (value < 1.5) {
      return 'CUKUP';
    }
    return 'KUAT';
  }

  private getAktivitasAnggotaRisk(rasioKeaktifan: number | null) {
    if (rasioKeaktifan === null) {
      return 'N/A';
    }
    if (rasioKeaktifan < 0.5) {
      return 'RENDAH';
    }
    if (rasioKeaktifan < 0.75) {
      return 'MENURUN';
    }
    return 'STABIL';
  }

  private buildRatioKpi(value: number | null, status: string) {
    return { value, status };
  }

  private getLikuiditasStatus(value: number | null) {
    if (value === null) {
      return 'N/A';
    }
    if (value > 1.5) {
      return 'SEHAT';
    }
    if (value >= 1) {
      return 'WASPADA';
    }
    return 'RISIKO';
  }

  private getKreditAktifStatus(value: number | null) {
    if (value === null) {
      return 'N/A';
    }
    if (value < 0.7) {
      return 'AMAN';
    }
    if (value <= 0.9) {
      return 'TINGGI';
    }
    return 'AGRESIF';
  }

  private getPembayaranStatus(value: number | null) {
    if (value === null) {
      return 'N/A';
    }
    if (value > 0.08) {
      return 'LANCAR';
    }
    if (value >= 0.04) {
      return 'MONITORING';
    }
    return 'RISIKO';
  }

  private getNetCashflowStatus(value: number) {
    if (value > 0) {
      return 'SURPLUS';
    }
    if (value === 0) {
      return 'BREAK_EVEN';
    }
    return 'DEFISIT';
  }

  private calculateKpi(args: {
    saldoAkhir: number;
    totalPenarikan: number;
    totalPinjamanAktif: number;
    totalSimpanan: number;
    totalAngsuran: number;
    anggotaBaru: number;
    anggotaKeluar: number;
    totalAnggota: number;
    netCashflow: number;
  }) {
    const rasioLikuiditas = this.safeDivide(
      args.saldoAkhir,
      args.totalPenarikan,
    );
    const rasioKreditAktif = this.safeDivide(
      args.totalPinjamanAktif,
      args.totalSimpanan,
    );
    const rasioPembayaran = this.safeDivide(
      args.totalAngsuran,
      args.totalPinjamanAktif,
    );
    const pertumbuhanAnggota = this.safeDivide(
      args.anggotaBaru - args.anggotaKeluar,
      args.totalAnggota,
    );

    return {
      rasioLikuiditas: this.buildRatioKpi(
        rasioLikuiditas,
        this.getLikuiditasStatus(rasioLikuiditas),
      ),
      rasioKreditAktif: this.buildRatioKpi(
        rasioKreditAktif,
        this.getKreditAktifStatus(rasioKreditAktif),
      ),
      rasioPembayaranLancar: this.buildRatioKpi(
        rasioPembayaran,
        this.getPembayaranStatus(rasioPembayaran),
      ),
      pertumbuhanAnggota: this.buildRatioKpi(
        pertumbuhanAnggota,
        pertumbuhanAnggota === null ? 'N/A' : 'INFO',
      ),
      netCashflow: {
        value: args.netCashflow,
        status: this.getNetCashflowStatus(args.netCashflow),
      },
    };
  }

  async getLaporanBulanan(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const prev = this.shiftMonth(bulan, tahun, -1);
    const prevRange = this.getMonthRange(prev.bulan, prev.tahun);

    const [
      simpananAgg,
      angsuranAgg,
      penarikanAgg,
      pencairanAgg,
      pinjamanAgg,
      totalPinjamanAktifAgg,
      totalSimpananAgg,
      anggotaAktif,
      totalAnggota,
      anggotaBaru,
      anggotaKeluar,
      saldoAwal,
      totalTransaksiAgg,
      prevSimpananAgg,
      prevPinjamanAgg,
      prevTransaksiAgg,
      prevTotalAnggota,
    ] = await Promise.all([
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.SETORAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.PENARIKAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.PENCAIRAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.aggregatePinjamanPeriode({
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumPinjamanAktifNominal(),
      this.laporanRepository.sumSaldoSimpanan(),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        status: NasabahStatus.AKTIF,
      }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
      }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        status: NasabahStatus.NONAKTIF,
        updatedAt: { gte: start, lte: end },
      }),
      this.getSaldoAwal(bulan, tahun),
      this.laporanRepository.countTransaksi({
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.SETORAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: prevRange.start,
        tanggalTo: prevRange.end,
      }),
      this.laporanRepository.aggregatePinjamanPeriode({
        tanggalFrom: prevRange.start,
        tanggalTo: prevRange.end,
      }),
      this.laporanRepository.countTransaksi({
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: prevRange.start,
        tanggalTo: prevRange.end,
      }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        createdAt: { lte: prevRange.end },
      }),
    ]);

    const totalSimpananMasuk = this.toNumber(simpananAgg._sum.nominal);
    const totalAngsuranDiterima = this.toNumber(angsuranAgg._sum.nominal);
    const totalPenarikan = this.toNumber(penarikanAgg._sum.nominal);
    const totalPencairan = this.toNumber(pencairanAgg._sum.nominal);
    const totalPinjamanDiberikan = this.toNumber(
      pinjamanAgg._sum.jumlahPinjaman,
    );
    const totalPinjamanAktif = this.toNumber(
      totalPinjamanAktifAgg._sum.sisaPinjaman,
    );
    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.saldoBerjalan);
    const totalTransaksi = totalTransaksiAgg._count._all;

    const pemasukan = totalSimpananMasuk + totalAngsuranDiterima;
    const pengeluaran = totalPenarikan + totalPencairan;
    const saldoAkhir = saldoAwal + pemasukan - pengeluaran;
    const netCashflow = pemasukan - pengeluaran;

    const prevTotalSimpananMasuk = this.toNumber(prevSimpananAgg._sum.nominal);
    const prevTotalPinjaman = this.toNumber(
      prevPinjamanAgg._sum.jumlahPinjaman,
    );
    const prevTotalTransaksi = prevTransaksiAgg._count._all;
    const growthSimpanan = this.calculateGrowth(
      totalSimpananMasuk,
      prevTotalSimpananMasuk,
    );
    const growthPinjaman = this.calculateGrowth(
      totalPinjamanDiberikan,
      prevTotalPinjaman,
    );
    const growthTransaksi = this.calculateGrowth(
      totalTransaksi,
      prevTotalTransaksi,
    );
    const growthAnggota = this.calculateGrowth(totalAnggota, prevTotalAnggota);

    const rasioLikuiditas = this.safeDivide(saldoAkhir, totalPenarikan);
    const rasioCashCoverage = this.safeDivide(
      totalAngsuranDiterima,
      totalPencairan,
    );
    const rasioKreditAktif = this.safeDivide(totalPinjamanAktif, totalSimpanan);

    const rasioKeaktifan = this.safeDivide(anggotaAktif, totalAnggota);
    const rasioKeaktifanAnggota = rasioKeaktifan;

    const riskEvaluation = {
      likuiditas: this.getLikuiditasRisk(rasioLikuiditas),
      ekspansiKredit: this.getEkspansiKreditRisk(rasioKreditAktif),
      arusKas: this.getArusKasRisk(netCashflow),
      ketahananKas: this.getKetahananKasRisk(rasioCashCoverage),
      aktivitasAnggota: this.getAktivitasAnggotaRisk(rasioKeaktifanAnggota),
    };

    return {
      message: 'Berhasil mengambil laporan bulanan',
      data: {
        periode: { bulan, tahun },
        summary: {
          totalSimpananMasuk,
          totalPinjamanDiberikan,
          totalAngsuranDiterima,
          totalPenarikan,
          saldoAwal,
          saldoAkhir,
          anggotaAktif,
          totalAnggota,
          anggotaBaru,
          anggotaKeluar,
        },
        performance: {
          growthSimpanan,
          growthPinjaman,
          growthTransaksi,
          growthAnggota,
          netCashflow,
        },
        financialIndicators: {
          rasioLikuiditas,
          rasioKreditAktif,
          rasioCashCoverage,
          rasioKeaktifanAnggota,
        },
        riskEvaluation,
      },
    };
  }

  async getLaporanTransaksi(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const allJenis = Object.values(JenisTransaksi) as JenisTransaksi[];
    const [grouped, totalAgg, totalNominalAgg] = await Promise.all([
      this.laporanRepository.groupTransaksiByJenis({
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.countTransaksi({
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: allJenis,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
    ]);

    const totalTransaksi = totalAgg._count._all;
    const totalNominal = this.toNumber(totalNominalAgg._sum.nominal);
    const daysInMonth = end.getDate();
    const rataRataPerHari = this.safeDivide(totalTransaksi, daysInMonth);
    const rataRataNominal = this.safeDivide(totalNominal, totalTransaksi);

    const jenisMap = this.buildJenisMap(allJenis, () => ({
      jumlah: 0,
      total: 0,
    }));

    for (const row of grouped) {
      jenisMap[row.jenisTransaksi] = {
        jumlah: row._count._all,
        total: this.toNumber(row._sum.nominal),
      };
    }

    const prev = this.shiftMonth(bulan, tahun, -1);
    const prev2 = this.shiftMonth(bulan, tahun, -2);
    const [prevCountAgg, prev2CountAgg] = await Promise.all([
      this.laporanRepository.countTransaksi({
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: this.getMonthRange(prev.bulan, prev.tahun).start,
        tanggalTo: this.getMonthRange(prev.bulan, prev.tahun).end,
      }),
      this.laporanRepository.countTransaksi({
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: this.getMonthRange(prev2.bulan, prev2.tahun).start,
        tanggalTo: this.getMonthRange(prev2.bulan, prev2.tahun).end,
      }),
    ]);
    const prevTotal = prevCountAgg._count._all;
    const prev2Total = prev2CountAgg._count._all;
    const growth = this.calculateGrowth(totalTransaksi, prevTotal);

    const tren3Bulan = this.getTransaksiTrend(
      totalTransaksi,
      prevTotal,
      prev2Total,
    );

    const [totalSetoranAgg, totalPencairanAgg] = await Promise.all([
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.SETORAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.PENCAIRAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
    ]);
    const totalSetoran = this.toNumber(totalSetoranAgg._sum.nominal);
    const totalPencairan = this.toNumber(totalPencairanAgg._sum.nominal);
    const rasioKreditTerhadapSetoran = this.safeDivide(
      totalPencairan,
      totalSetoran,
    );

    const totalNasabahTransaksi =
      await this.laporanRepository.countDistinctNasabahTransaksi({
        jenisTransaksi: allJenis,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      });
    const topCount = Math.max(1, Math.ceil(totalNasabahTransaksi * 0.1));
    const topNasabah = await this.laporanRepository.topNasabahByNominal({
      jenisTransaksi: allJenis,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
      take: topCount,
    });
    const topNominal = topNasabah.reduce((acc, row) => {
      return acc + this.toNumber(row._sum.nominal);
    }, 0);
    const konsentrasiTop10Anggota = this.safeDivide(topNominal, totalNominal);

    const lonjakanTransaksiTidakWajar = growth !== null && growth > 0.5;

    return {
      message: 'Berhasil mengambil laporan transaksi',
      data: {
        periode: { bulan, tahun },
        summary: {
          totalTransaksi,
          totalNominal,
          rataRataPerHari,
          rataRataNominal,
        },
        breakdown: jenisMap,
        growth: {
          dibandingBulanLalu: growth,
          tren3Bulan,
        },
        riskIndicators: {
          rasioKreditTerhadapSetoran,
          konsentrasiTop10Anggota,
          lonjakanTransaksiTidakWajar,
        },
      },
    };
  }

  async getLaporanAngsuran(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const totalAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: JenisTransaksi.ANGSURAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const countAgg = await this.laporanRepository.countTransaksi({
      jenisTransaksi: JenisTransaksi.ANGSURAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const totalPinjamanAktifAgg =
      await this.laporanRepository.sumPinjamanAktifNominal();
    const totalPencairanAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: JenisTransaksi.PENCAIRAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const jumlahPeminjam =
      await this.laporanRepository.countDistinctNasabahTransaksi({
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      });

    const totalAngsuranMasuk = this.toNumber(totalAgg._sum.nominal);
    const jumlahTransaksi = countAgg._count._all;
    const totalPinjamanAktif = this.toNumber(
      totalPinjamanAktifAgg._sum.sisaPinjaman,
    );
    const totalPencairanBulanIni = this.toNumber(
      totalPencairanAgg._sum.nominal,
    );
    const rataRataAngsuran = this.safeDivide(
      totalAngsuranMasuk,
      jumlahTransaksi,
    );
    const rasioPembayaranLancar = this.safeDivide(
      totalAngsuranMasuk,
      totalPinjamanAktif,
    );
    const coverageTerhadapPencairan = this.safeDivide(
      totalAngsuranMasuk,
      totalPencairanBulanIni,
    );
    const rataRataPerPeminjam = this.safeDivide(
      totalAngsuranMasuk,
      jumlahPeminjam,
    );

    let kpiStatus = 'SEHAT';
    if ((rasioPembayaranLancar ?? 0) < 0.04) {
      kpiStatus = 'RISIKO';
    } else if ((rasioPembayaranLancar ?? 0) < 0.08) {
      kpiStatus = 'WASPADA';
    }

    const interpretasiKredit =
      coverageTerhadapPencairan !== null && coverageTerhadapPencairan >= 1
        ? 'Pembayaran stabil dan mampu menutup pencairan bulan ini'
        : 'Pencairan lebih besar dari angsuran, perlu monitoring';
    let risikoKredit = 'Rendah';
    if (kpiStatus === 'WASPADA') {
      risikoKredit = 'Sedang';
    } else if (kpiStatus === 'RISIKO') {
      risikoKredit = 'Tinggi';
    }

    return {
      message: 'Berhasil mengambil laporan angsuran',
      data: {
        periode: { bulan, tahun },
        summary: {
          totalAngsuranMasuk,
          jumlahTransaksi,
          rataRataAngsuran,
        },
        metrics: {
          rasioPembayaranLancar,
          coverageTerhadapPencairan,
          rataRataPerPeminjam,
        },
        insight: {
          interpretasiKredit,
          risikoKredit,
        },
        kpiStatus,
      },
    };
  }

  async getLaporanPenarikan(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const totalAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const totalCount = await this.laporanRepository.countTransaksi({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const totalSimpananAgg = await this.laporanRepository.sumSaldoSimpanan();
    const topNasabahNominal = await this.laporanRepository.topNasabahByNominal({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
      take: 3,
    });

    const totalPenarikan = this.toNumber(totalAgg._sum.nominal);
    const jumlahTransaksi = totalCount._count._all;
    const rataRataPenarikan = this.safeDivide(totalPenarikan, jumlahTransaksi);
    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.saldoBerjalan);
    const rasioTerhadapSimpanan = this.safeDivide(
      totalPenarikan,
      totalSimpanan,
    );

    const { start: prevStart, end: prevEnd } = this.getMonthRange(
      bulan === 1 ? 12 : bulan - 1,
      bulan === 1 ? tahun - 1 : tahun,
    );
    const prevAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: prevStart,
      tanggalTo: prevEnd,
    });
    const prevTotal = this.toNumber(prevAgg._sum.nominal);
    const growthDariBulanLalu = this.calculateGrowth(totalPenarikan, prevTotal);

    const top3Total = topNasabahNominal.reduce((acc, row) => {
      return acc + this.toNumber(row._sum.nominal);
    }, 0);
    const konsentrasiTop3 = this.safeDivide(top3Total, totalPenarikan);

    let kpiStatus = 'AMAN';
    const ratioValue = rasioTerhadapSimpanan ?? 0;
    if (ratioValue >= 0.4) {
      kpiStatus = 'RISIKO';
    } else if (ratioValue >= 0.2) {
      kpiStatus = 'WASPADA';
    }

    let interpretasiLikuiditas = 'Penarikan masih dalam batas aman';
    if (kpiStatus === 'WASPADA') {
      interpretasiLikuiditas = 'Tekanan likuiditas mulai meningkat';
    } else if (kpiStatus === 'RISIKO') {
      interpretasiLikuiditas = 'Penarikan terlalu tinggi dan berisiko';
    }

    return {
      message: 'Berhasil mengambil laporan penarikan',
      data: {
        periode: { bulan, tahun },
        summary: {
          totalPenarikan,
          jumlahTransaksi,
          rataRataPenarikan,
        },
        metrics: {
          rasioTerhadapSimpanan,
          growthDariBulanLalu,
          konsentrasiTop3,
        },
        insight: {
          interpretasiLikuiditas,
          tren: this.formatGrowthText(growthDariBulanLalu),
        },
        kpiStatus,
      },
    };
  }

  async getLaporanPinjaman(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const totalPinjamanAktif =
      await this.laporanRepository.countPinjamanAktif();
    const totalPinjamanAktifAgg =
      await this.laporanRepository.sumPinjamanAktifNominal();
    const pinjamanBaru = await this.laporanRepository.countPinjamanBaru({
      tanggalFrom: start,
      tanggalTo: end,
    });
    const totalSimpananAgg = await this.laporanRepository.sumSaldoSimpanan();
    const topOutstanding =
      await this.laporanRepository.listTopOutstandingPinjaman(5);

    const totalOutstanding = this.toNumber(
      totalPinjamanAktifAgg._sum.sisaPinjaman,
    );
    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.saldoBerjalan);
    const rasioPinjamanTerhadapSimpanan = this.safeDivide(
      totalOutstanding,
      totalSimpanan,
    );
    const top5Outstanding = topOutstanding.reduce((acc, item) => {
      return acc + this.toNumber(item.sisaPinjaman);
    }, 0);
    const konsentrasiTop5 = this.safeDivide(top5Outstanding, totalOutstanding);
    const rataRataOutstanding = this.safeDivide(
      totalOutstanding,
      totalPinjamanAktif,
    );

    let kpiStatus = 'STABIL';
    const ratioValue = rasioPinjamanTerhadapSimpanan ?? 0;
    if (ratioValue > 0.85) {
      kpiStatus = 'RISIKO';
    } else if (ratioValue >= 0.7) {
      kpiStatus = 'WASPADA';
    }

    let ekspansiKredit = 'Masih dalam batas sehat';
    if (kpiStatus === 'WASPADA') {
      ekspansiKredit = 'Mulai mendekati batas aman';
    } else if (kpiStatus === 'RISIKO') {
      ekspansiKredit = 'Ekspansi terlalu agresif';
    }
    let risikoKonsentrasi = 'Rendah';
    const konsentrasiValue = konsentrasiTop5 ?? 0;
    if (konsentrasiValue > 0.6) {
      risikoKonsentrasi = 'Tinggi';
    } else if (konsentrasiValue >= 0.4) {
      risikoKonsentrasi = 'Sedang';
    }

    return {
      message: 'Berhasil mengambil laporan pinjaman',
      data: {
        periode: { bulan, tahun },
        summary: {
          totalPinjamanAktif,
          totalOutstanding,
          pinjamanBaru,
        },
        metrics: {
          rasioPinjamanTerhadapSimpanan,
          konsentrasiTop5,
          rataRataOutstanding,
        },
        insight: {
          ekspansiKredit,
          risikoKonsentrasi,
        },
        kpiStatus,
      },
    };
  }

  async getLaporanSimpanan(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const saldoGrouped =
      await this.laporanRepository.groupSaldoSimpananByJenis();
    const totalSimpananAgg = await this.laporanRepository.sumSaldoSimpanan();
    const setoranAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: JenisTransaksi.SETORAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const penarikanAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const anggotaAktif = await this.laporanRepository.countNasabah({
      deletedAt: null,
      status: NasabahStatus.AKTIF,
    });

    const saldoMap: Record<string, number> = {
      [JenisSimpanan.POKOK]: 0,
      [JenisSimpanan.WAJIB]: 0,
      [JenisSimpanan.SUKARELA]: 0,
    };

    for (const row of saldoGrouped) {
      saldoMap[row.jenisSimpanan] = this.toNumber(row._sum.saldoBerjalan);
    }

    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.saldoBerjalan);
    const totalSetoran = this.toNumber(setoranAgg._sum.nominal);
    const totalPenarikan = this.toNumber(penarikanAgg._sum.nominal);
    const prevTotal = totalSimpanan - (totalSetoran - totalPenarikan);
    const growthSimpanan = this.calculateGrowth(totalSimpanan, prevTotal);
    const rasioSukarela = this.safeDivide(
      saldoMap[JenisSimpanan.SUKARELA],
      totalSimpanan,
    );
    const rataRataSaldoAnggota = this.safeDivide(totalSimpanan, anggotaAktif);

    let pertumbuhanDana = 'Belum ada data pembanding bulan lalu';
    if (growthSimpanan !== null) {
      if (growthSimpanan > 0) {
        pertumbuhanDana = `Simpanan tumbuh ${Math.round(growthSimpanan * 100)}% dari bulan lalu`;
      } else if (growthSimpanan < 0) {
        pertumbuhanDana = `Simpanan turun ${Math.round(Math.abs(growthSimpanan) * 100)}% dari bulan lalu`;
      } else {
        pertumbuhanDana = 'Simpanan stabil dibanding bulan lalu';
      }
    }
    let kepercayaanAnggota = 'Cukup baik';
    const sukarelaValue = rasioSukarela ?? 0;
    if (sukarelaValue >= 0.2) {
      kepercayaanAnggota = 'Baik';
    } else if (sukarelaValue < 0.1) {
      kepercayaanAnggota = 'Rendah';
    }

    let kpiStatus = 'BERTUMBUH';
    if (growthSimpanan === null) {
      kpiStatus = 'N/A';
    } else if (growthSimpanan < 0) {
      kpiStatus = 'MENURUN';
    } else if (growthSimpanan === 0) {
      kpiStatus = 'STAGNAN';
    }

    return {
      message: 'Berhasil mengambil laporan simpanan',
      data: {
        periode: { bulan, tahun },
        summary: {
          totalSimpanan,
          simpananPokok: saldoMap[JenisSimpanan.POKOK],
          simpananWajib: saldoMap[JenisSimpanan.WAJIB],
          simpananSukarela: saldoMap[JenisSimpanan.SUKARELA],
        },
        metrics: {
          growthSimpanan,
          rasioSukarela,
          rataRataSaldoAnggota,
        },
        insight: {
          pertumbuhanDana,
          kepercayaanAnggota,
        },
        kpiStatus,
      },
    };
  }

  async getLaporanCashflow(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const [pemasukanAgg, pengeluaranAgg, saldoAwal, angsuranAgg] =
      await Promise.all([
        this.laporanRepository.sumTransaksiNominal({
          jenisTransaksi: [JenisTransaksi.SETORAN, JenisTransaksi.ANGSURAN],
          statusTransaksi: StatusTransaksi.APPROVED,
          tanggalFrom: start,
          tanggalTo: end,
        }),
        this.laporanRepository.sumTransaksiNominal({
          jenisTransaksi: [JenisTransaksi.PENARIKAN, JenisTransaksi.PENCAIRAN],
          statusTransaksi: StatusTransaksi.APPROVED,
          tanggalFrom: start,
          tanggalTo: end,
        }),
        this.getSaldoAwal(bulan, tahun),
        this.laporanRepository.sumTransaksiNominal({
          jenisTransaksi: JenisTransaksi.ANGSURAN,
          statusTransaksi: StatusTransaksi.APPROVED,
          tanggalFrom: start,
          tanggalTo: end,
        }),
      ]);

    const pemasukan = this.toNumber(pemasukanAgg._sum.nominal);
    const pengeluaran = this.toNumber(pengeluaranAgg._sum.nominal);
    const surplus = pemasukan - pengeluaran;
    const saldoAkhir = saldoAwal + surplus;
    const totalAngsuran = this.toNumber(angsuranAgg._sum.nominal);

    const rasioLikuiditas = this.safeDivide(saldoAwal + pemasukan, pengeluaran);
    const rasioPengeluaran = this.safeDivide(pengeluaran, pemasukan);
    const dependencyOnAngsuran = this.safeDivide(totalAngsuran, pemasukan);

    const prev = this.shiftMonth(bulan, tahun, -1);
    const prevRange = this.getMonthRange(prev.bulan, prev.tahun);
    const [prevPemasukanAgg, prevPengeluaranAgg] = await Promise.all([
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: [JenisTransaksi.SETORAN, JenisTransaksi.ANGSURAN],
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: prevRange.start,
        tanggalTo: prevRange.end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: [JenisTransaksi.PENARIKAN, JenisTransaksi.PENCAIRAN],
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: prevRange.start,
        tanggalTo: prevRange.end,
      }),
    ]);
    const prevSurplus =
      this.toNumber(prevPemasukanAgg._sum.nominal) -
      this.toNumber(prevPengeluaranAgg._sum.nominal);
    const cashflowGrowth = this.calculateGrowth(surplus, prevSurplus);

    const monthRanges = Array.from({ length: 3 }, (_, index) => {
      const shifted = this.shiftMonth(bulan, tahun, -index);
      return this.getMonthRange(shifted.bulan, shifted.tahun);
    });
    const cashflowAggs = await Promise.all(
      monthRanges.map(async (range) => {
        const [inAgg, outAgg] = await Promise.all([
          this.laporanRepository.sumTransaksiNominal({
            jenisTransaksi: [JenisTransaksi.SETORAN, JenisTransaksi.ANGSURAN],
            statusTransaksi: StatusTransaksi.APPROVED,
            tanggalFrom: range.start,
            tanggalTo: range.end,
          }),
          this.laporanRepository.sumTransaksiNominal({
            jenisTransaksi: [
              JenisTransaksi.PENARIKAN,
              JenisTransaksi.PENCAIRAN,
            ],
            statusTransaksi: StatusTransaksi.APPROVED,
            tanggalFrom: range.start,
            tanggalTo: range.end,
          }),
        ]);

        return {
          pemasukan: this.toNumber(inAgg._sum.nominal),
          pengeluaran: this.toNumber(outAgg._sum.nominal),
        };
      }),
    );
    const pengeluaran3Bulan = cashflowAggs.map((item) => item.pengeluaran);
    const rataRataPengeluaranBulanan = this.safeDivide(
      pengeluaran3Bulan.reduce((acc, val) => acc + val, 0),
      pengeluaran3Bulan.length,
    );
    const cashCoverageMonth =
      rataRataPengeluaranBulanan === null
        ? null
        : this.safeDivide(saldoAkhir, rataRataPengeluaranBulanan);

    let defisitBeruntun = 0;
    for (const cashflow of cashflowAggs) {
      const monthlySurplus = cashflow.pemasukan - cashflow.pengeluaran;
      if (monthlySurplus < 0) {
        defisitBeruntun += 1;
      } else {
        break;
      }
    }

    const earlyWarning = {
      likuiditasRendah: (rasioLikuiditas ?? 0) < 1,
      defisitBerulang: defisitBeruntun >= 2,
    };

    return {
      message: 'Berhasil mengambil laporan cashflow',
      data: {
        periode: { bulan, tahun },
        summary: {
          saldoAwal,
          pemasukan,
          pengeluaran,
          surplus,
          saldoAkhir,
        },
        rasio: {
          rasioLikuiditas,
          rasioPengeluaran,
          cashCoverageMonth,
          dependencyOnAngsuran,
        },
        tren: {
          cashflowGrowth,
          defisitBeruntun,
        },
        earlyWarning,
      },
    };
  }

  async getLaporanAnggota(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);

    const [
      totalTerdaftar,
      anggotaAktif,
      anggotaBaru,
      anggotaKeluar,
      anggotaDenganPinjamanAktif,
      nasabahList,
      lastTransaksi,
      totalSimpananAgg,
      totalPinjamanAktifAgg,
      anggotaDenganTransaksi,
      topSimpananNasabah,
    ] = await Promise.all([
      this.laporanRepository.countNasabah({ deletedAt: null }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        status: NasabahStatus.AKTIF,
      }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      }),
      this.laporanRepository.countNasabah({
        deletedAt: null,
        status: NasabahStatus.NONAKTIF,
        updatedAt: { gte: start, lte: end },
      }),
      this.laporanRepository.countNasabahWithPinjamanAktif(),
      this.laporanRepository.listNasabahBasic(),
      this.laporanRepository.groupLastTransaksiPerNasabah(),
      this.laporanRepository.sumSaldoSimpanan(),
      this.laporanRepository.sumPinjamanAktifNominal(),
      this.laporanRepository.countDistinctNasabahTransaksi({
        jenisTransaksi: Object.values(JenisTransaksi) as JenisTransaksi[],
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.topNasabahBySaldoSimpanan(5),
    ]);

    const lastTransaksiMap = new Map<number, Date | null>();
    for (const row of lastTransaksi) {
      lastTransaksiMap.set(row.nasabahId, row._max.tanggal ?? null);
    }

    const thresholdTidakAktif = this.subtractMonths(end, 3);
    const thresholdTanpaTransaksi = this.subtractMonths(end, 2);
    let tidakAktifLebih3Bulan = 0;
    let tanpaTransaksiLebih2Bulan = 0;

    for (const nasabah of nasabahList) {
      if (nasabah.status !== NasabahStatus.AKTIF) {
        continue;
      }

      const lastDate = lastTransaksiMap.get(nasabah.id) ?? null;
      if (!lastDate || lastDate <= thresholdTidakAktif) {
        tidakAktifLebih3Bulan += 1;
      }
      if (!lastDate || lastDate <= thresholdTanpaTransaksi) {
        tanpaTransaksiLebih2Bulan += 1;
      }
    }

    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.saldoBerjalan);
    const totalPinjamanAktif = this.toNumber(
      totalPinjamanAktifAgg._sum.sisaPinjaman,
    );
    const rataRataPinjamanPerAnggota = this.safeDivide(
      totalPinjamanAktif,
      anggotaDenganPinjamanAktif,
    );
    const rasioKeaktifan = this.safeDivide(anggotaAktif, totalTerdaftar);
    const rasioPertumbuhan = this.safeDivide(
      anggotaBaru - anggotaKeluar,
      totalTerdaftar,
    );
    const rasioPartisipasiTransaksi = this.safeDivide(
      anggotaDenganTransaksi,
      anggotaAktif,
    );
    const rasioPinjamanAktif = this.safeDivide(
      anggotaDenganPinjamanAktif,
      anggotaAktif,
    );
    const topSimpananTotal = topSimpananNasabah.reduce((acc, row) => {
      return acc + this.toNumber(row._sum.saldoBerjalan);
    }, 0);
    const konsentrasiSimpananTop5 = this.safeDivide(
      topSimpananTotal,
      totalSimpanan,
    );
    const anggotaDormantRisk = this.safeDivide(
      tidakAktifLebih3Bulan,
      anggotaAktif,
    );

    return {
      message: 'Berhasil mengambil laporan anggota',
      data: {
        periode: { bulan, tahun },
        population: {
          totalTerdaftar,
          anggotaAktif,
          anggotaBaru,
          anggotaKeluar,
        },
        aktivitas: {
          anggotaDenganTransaksi,
          tanpaTransaksiLebih2Bulan,
          tidakAktifLebih3Bulan,
        },
        kredit: {
          anggotaDenganPinjamanAktif,
          rataRataPinjamanPerAnggota,
        },
        rasio: {
          rasioKeaktifan,
          rasioPertumbuhan,
          rasioPartisipasiTransaksi,
          rasioPinjamanAktif,
        },
        riskIndicators: {
          konsentrasiSimpananTop5,
          anggotaDormantRisk,
        },
      },
    };
  }

  private async buildSnapshotTotals(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const [
      totalSimpananAgg,
      totalPenarikanAgg,
      totalAngsuranAgg,
      totalPencairanAgg,
      totalPinjamanAgg,
      saldoAwal,
    ] = await Promise.all([
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.SETORAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.PENARIKAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.PENCAIRAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.aggregatePinjamanPeriode({
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.getSaldoAwal(bulan, tahun),
    ]);

    const totalSimpanan = this.toNumber(totalSimpananAgg._sum.nominal);
    const totalPenarikan = this.toNumber(totalPenarikanAgg._sum.nominal);
    const totalAngsuran = this.toNumber(totalAngsuranAgg._sum.nominal);
    const totalPencairan = this.toNumber(totalPencairanAgg._sum.nominal);
    const totalPinjaman = this.toNumber(totalPinjamanAgg._sum.jumlahPinjaman);

    const pemasukan = totalSimpanan + totalAngsuran;
    const pengeluaran = totalPenarikan + totalPencairan;
    const saldoAkhir = saldoAwal + pemasukan - pengeluaran;

    return {
      totalSimpanan,
      totalPenarikan,
      totalPinjaman,
      totalAngsuran,
      saldoAkhir,
    };
  }

  async generateLaporanKeuangan(bulan: number, tahun: number, userId: number) {
    const existing = await this.laporanRepository.findLaporanKeuanganByPeriode(
      bulan,
      tahun,
    );

    if (existing?.statusLaporan === StatusLaporan.FINAL) {
      throw new BadRequestException('Laporan keuangan sudah FINAL');
    }

    const totals = await this.buildSnapshotTotals(bulan, tahun);
    const generatedAt = new Date();

    const laporan = existing
      ? await this.laporanRepository.updateLaporanKeuangan(existing.id, {
          ...totals,
          generatedAt,
        })
      : await this.laporanRepository.createLaporanKeuangan({
          periodeBulan: bulan,
          periodeTahun: tahun,
          ...totals,
          statusLaporan: StatusLaporan.DRAFT,
          generatedById: userId,
          generatedAt,
        });

    return {
      message: 'Laporan keuangan berhasil di-generate',
      data: laporan,
    };
  }

  async getLaporanKeuangan(bulan: number, tahun: number) {
    const laporan = await this.laporanRepository.findLaporanKeuanganByPeriode(
      bulan,
      tahun,
    );

    if (!laporan) {
      throw new BadRequestException('Laporan keuangan tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil laporan keuangan',
      data: laporan,
    };
  }

  async finalizeLaporanKeuangan(id: number) {
    const laporan = await this.laporanRepository.findLaporanKeuanganById(id);
    if (!laporan) {
      throw new BadRequestException('Laporan keuangan tidak ditemukan');
    }

    if (laporan.statusLaporan === StatusLaporan.FINAL) {
      throw new BadRequestException('Laporan keuangan sudah FINAL');
    }

    const updated = await this.laporanRepository.updateLaporanStatus(
      id,
      StatusLaporan.FINAL,
    );

    return {
      message: 'Laporan keuangan berhasil difinalisasi',
      data: updated,
    };
  }
}
