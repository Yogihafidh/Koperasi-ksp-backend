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

const SMALL_SALDO_THRESHOLD = 100000;

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

  private buildRatioKpi(value: number | null, status: string) {
    return { value, status };
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
    const rasioLikuiditas =
      args.totalPenarikan > 0 ? args.saldoAkhir / args.totalPenarikan : null;
    const rasioLikuiditasStatus =
      rasioLikuiditas === null
        ? 'N/A'
        : rasioLikuiditas > 1.5
          ? 'SEHAT'
          : rasioLikuiditas >= 1.0
            ? 'WASPADA'
            : 'RISIKO';

    const rasioKreditAktif =
      args.totalSimpanan > 0
        ? args.totalPinjamanAktif / args.totalSimpanan
        : null;
    const rasioKreditAktifStatus =
      rasioKreditAktif === null
        ? 'N/A'
        : rasioKreditAktif < 0.7
          ? 'AMAN'
          : rasioKreditAktif <= 0.9
            ? 'TINGGI'
            : 'AGRESIF';

    const rasioPembayaran =
      args.totalPinjamanAktif > 0
        ? args.totalAngsuran / args.totalPinjamanAktif
        : null;
    const rasioPembayaranStatus =
      rasioPembayaran === null
        ? 'N/A'
        : rasioPembayaran > 0.08
          ? 'LANCAR'
          : rasioPembayaran >= 0.04
            ? 'MONITORING'
            : 'RISIKO';

    const pertumbuhanAnggota =
      args.totalAnggota > 0
        ? (args.anggotaBaru - args.anggotaKeluar) / args.totalAnggota
        : null;

    const netCashflowStatus =
      args.netCashflow > 0
        ? 'SURPLUS'
        : args.netCashflow === 0
          ? 'BREAK_EVEN'
          : 'DEFISIT';

    return {
      rasioLikuiditas: this.buildRatioKpi(
        rasioLikuiditas,
        rasioLikuiditasStatus,
      ),
      rasioKreditAktif: this.buildRatioKpi(
        rasioKreditAktif,
        rasioKreditAktifStatus,
      ),
      rasioPembayaranLancar: this.buildRatioKpi(
        rasioPembayaran,
        rasioPembayaranStatus,
      ),
      pertumbuhanAnggota: this.buildRatioKpi(
        pertumbuhanAnggota,
        pertumbuhanAnggota === null ? 'N/A' : 'INFO',
      ),
      netCashflow: {
        value: args.netCashflow,
        status: netCashflowStatus,
      },
    };
  }

  async getLaporanBulanan(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);

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

    const pemasukan = totalSimpananMasuk + totalAngsuranDiterima;
    const pengeluaran = totalPenarikan + totalPencairan;
    const saldoAkhir = saldoAwal + pemasukan - pengeluaran;

    const kpi = this.calculateKpi({
      saldoAkhir,
      totalPenarikan,
      totalPinjamanAktif,
      totalSimpanan,
      totalAngsuran: totalAngsuranDiterima,
      anggotaBaru,
      anggotaKeluar,
      totalAnggota,
      netCashflow: pemasukan - pengeluaran,
    });

    return {
      message: 'Berhasil mengambil laporan bulanan',
      data: {
        periode: { bulan, tahun },
        totalSimpananMasuk,
        totalPinjamanDiberikan,
        totalAngsuranDiterima,
        totalPenarikan,
        totalPencairan,
        saldoAwal,
        saldoAkhir,
        anggotaAktif,
        totalAnggota,
        anggotaBaru,
        anggotaKeluar,
        kpi,
      },
    };
  }

  async getLaporanTransaksi(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const [grouped, totalAgg] = await Promise.all([
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
    ]);

    const jenisMap = this.buildJenisMap(
      Object.values(JenisTransaksi) as JenisTransaksi[],
      () => ({
        jumlahTransaksi: 0,
        totalNominal: 0,
      }),
    );

    for (const row of grouped) {
      jenisMap[row.jenisTransaksi] = {
        jumlahTransaksi: row._count._all,
        totalNominal: this.toNumber(row._sum.nominal),
      };
    }

    return {
      message: 'Berhasil mengambil laporan transaksi',
      data: {
        periode: { bulan, tahun },
        totalTransaksi: totalAgg._count._all,
        breakdown: jenisMap,
      },
    };
  }

  async getLaporanAngsuran(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const [totalAgg, countAgg, angsuranLunas] = await Promise.all([
      this.laporanRepository.sumTransaksiNominal({
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.countTransaksi({
        jenisTransaksi: JenisTransaksi.ANGSURAN,
        statusTransaksi: StatusTransaksi.APPROVED,
        tanggalFrom: start,
        tanggalTo: end,
      }),
      this.laporanRepository.countAngsuranLunasInPeriod({
        tanggalFrom: start,
        tanggalTo: end,
      }),
    ]);

    return {
      message: 'Berhasil mengambil laporan angsuran',
      data: {
        periode: { bulan, tahun },
        totalAngsuranMasuk: this.toNumber(totalAgg._sum.nominal),
        jumlahTransaksi: countAgg._count._all,
        angsuranLunas,
        anggotaTerlambat: 0,
        totalDenda: 0,
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
    const statusGrouped = await this.laporanRepository.groupTransaksiByStatus({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const maxAgg = await this.laporanRepository.maxTransaksiNominal({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const topNasabah = await this.laporanRepository.topNasabahByTransaksi({
      jenisTransaksi: JenisTransaksi.PENARIKAN,
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
      take: 1,
    });

    const statusMap: Record<string, number> = {
      APPROVED: 0,
      REJECTED: 0,
      PENDING: 0,
    };

    for (const row of statusGrouped) {
      statusMap[row.statusTransaksi] = row._count._all;
    }

    type TopNasabahRow = { nasabahId: number; _count: { _all: number } };
    const topNasabahRows = topNasabah as TopNasabahRow[];
    const topNasabahIds = topNasabahRows.map((row) => row.nasabahId);
    const nasabahList = topNasabahIds.length
      ? await this.laporanRepository.findNasabahByIds(topNasabahIds)
      : [];
    type NasabahSummary = { nama: string; nomorAnggota: string };
    const nasabahMap = nasabahList.reduce<Record<number, NasabahSummary>>(
      (acc, item) => {
        acc[item.id] = { nama: item.nama, nomorAnggota: item.nomorAnggota };
        return acc;
      },
      {},
    );
    const topCount = topNasabahRows[0]?._count._all ?? 0;

    const anggotaPalingSeringMenarik = topNasabahRows[0]
      ? {
          nasabahId: topNasabahRows[0].nasabahId,
          nama: nasabahMap[topNasabahRows[0].nasabahId]?.nama ?? null,
          nomorAnggota:
            nasabahMap[topNasabahRows[0].nasabahId]?.nomorAnggota ?? null,
          totalTransaksi: topCount,
        }
      : null;

    return {
      message: 'Berhasil mengambil laporan penarikan',
      data: {
        periode: { bulan, tahun },
        totalPenarikan: this.toNumber(totalAgg._sum.nominal),
        jumlahTransaksi: totalCount._count._all,
        disetujui: statusMap.APPROVED,
        ditolak: statusMap.REJECTED,
        penarikanTerbesar: this.toNumber(maxAgg._max.nominal),
        anggotaPalingSeringMenarik,
      },
    };
  }

  async getLaporanPinjaman(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);

    const totalPinjamanAktif =
      await this.laporanRepository.countPinjamanAktif();
    const pinjamanBaru = await this.laporanRepository.countPinjamanBaru({
      tanggalFrom: start,
      tanggalTo: end,
    });
    const pinjamanAgg = await this.laporanRepository.aggregatePinjamanPeriode({
      tanggalFrom: start,
      tanggalTo: end,
    });
    const tenorUmum = await this.laporanRepository.groupPinjamanTenor({
      tanggalFrom: start,
      tanggalTo: end,
    });

    const tenorData = tenorUmum[0]
      ? {
          tenorBulan: tenorUmum[0].tenorBulan,
          jumlah: tenorUmum[0]._count._all,
        }
      : null;

    return {
      message: 'Berhasil mengambil laporan pinjaman',
      data: {
        periode: { bulan, tahun },
        totalPinjamanAktif,
        pinjamanBaru,
        totalDanaDipinjamkan: this.toNumber(pinjamanAgg._sum.jumlahPinjaman),
        pinjamanTerkecil: this.toNumber(pinjamanAgg._min.jumlahPinjaman),
        pinjamanTerbesar: this.toNumber(pinjamanAgg._max.jumlahPinjaman),
        bungaRataRata: this.toNumber(pinjamanAgg._avg.bungaPersen),
        tenorUmum: tenorData,
      },
    };
  }

  async getLaporanSimpanan(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);

    const saldoGrouped =
      await this.laporanRepository.groupSaldoSimpananByJenis();
    const belumSetorWajib =
      await this.laporanRepository.countRekeningWajibBelumSetor({
        tanggalFrom: start,
        tanggalTo: end,
      });
    const saldoKecil = await this.laporanRepository.countRekeningSaldoKecil(
      SMALL_SALDO_THRESHOLD,
    );
    const saldoTertinggiAgg = await this.laporanRepository.maxSaldoSimpanan();

    const saldoMap: Record<string, number> = {
      [JenisSimpanan.POKOK]: 0,
      [JenisSimpanan.WAJIB]: 0,
      [JenisSimpanan.SUKARELA]: 0,
    };

    for (const row of saldoGrouped) {
      saldoMap[row.jenisSimpanan] = this.toNumber(row._sum.saldoBerjalan);
    }

    return {
      message: 'Berhasil mengambil laporan simpanan',
      data: {
        periode: { bulan, tahun },
        simpananPokok: saldoMap[JenisSimpanan.POKOK],
        simpananWajib: saldoMap[JenisSimpanan.WAJIB],
        simpananSukarela: saldoMap[JenisSimpanan.SUKARELA],
        belumSetorWajib,
        saldoKecil: saldoKecil,
        saldoTertinggi: this.toNumber(saldoTertinggiAgg._max.saldoBerjalan),
        tenorUmum: null,
      },
    };
  }

  async getLaporanCashflow(bulan: number, tahun: number) {
    const { start, end } = this.getMonthRange(bulan, tahun);
    const pemasukanAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: [JenisTransaksi.SETORAN, JenisTransaksi.ANGSURAN],
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const pengeluaranAgg = await this.laporanRepository.sumTransaksiNominal({
      jenisTransaksi: [JenisTransaksi.PENARIKAN, JenisTransaksi.PENCAIRAN],
      statusTransaksi: StatusTransaksi.APPROVED,
      tanggalFrom: start,
      tanggalTo: end,
    });
    const saldoAwal = await this.getSaldoAwal(bulan, tahun);

    const pemasukan = this.toNumber(pemasukanAgg._sum.nominal);
    const pengeluaran = this.toNumber(pengeluaranAgg._sum.nominal);
    const surplus = pemasukan - pengeluaran;
    const saldoAkhir = saldoAwal + surplus;

    return {
      message: 'Berhasil mengambil laporan cashflow',
      data: {
        periode: { bulan, tahun },
        pemasukan,
        pengeluaran,
        surplus,
        saldoAwal,
        saldoAkhir,
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

    return {
      message: 'Berhasil mengambil laporan anggota',
      data: {
        periode: { bulan, tahun },
        totalTerdaftar,
        anggotaAktif,
        anggotaBaru,
        anggotaKeluar,
        anggotaDenganPinjamanAktif,
        tidakAktifLebih3Bulan,
        tanpaTransaksiLebih2Bulan,
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
