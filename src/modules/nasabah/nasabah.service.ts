import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JenisDokumen, NasabahStatus } from '@prisma/client';
import { NasabahRepository } from './nasabah.repository';
import {
  CreateNasabahDto,
  UpdateNasabahDto,
  VerifikasiNasabahDto,
  UpdateNasabahStatusDto,
} from './dto';
import { MinioService } from '../../common/storage/minio.service';
import { DEFAULT_PAGE_SIZE } from '../../common/constants/pagination.constants';

type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type UploadFiles = {
  ktp?: UploadFile[];
  kk?: UploadFile[];
  slipGaji?: UploadFile[];
};

@Injectable()
export class NasabahService {
  constructor(
    private readonly nasabahRepository: NasabahRepository,
    private readonly minioService: MinioService,
  ) {}

  private async generateNomorAnggota() {
    const prefix = 'AGT';
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    for (let i = 0; i < 5; i += 1) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const nomorAnggota = `${prefix}-${y}${m}${d}-${rand}`;
      const existing =
        await this.nasabahRepository.findNasabahByNomorAnggota(nomorAnggota);
      if (!existing) {
        return nomorAnggota;
      }
    }

    throw new BadRequestException('Gagal menghasilkan nomor anggota');
  }

  async createNasabah(dto: CreateNasabahDto, userId: number) {
    const pegawai = await this.nasabahRepository.findPegawaiByUserId(userId);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    const existingNik = await this.nasabahRepository.findNasabahByNik(dto.nik);
    if (existingNik) {
      throw new ConflictException('NIK sudah terdaftar');
    }

    const nomorAnggota = await this.generateNomorAnggota();
    const tanggalDaftar = dto.tanggalDaftar
      ? new Date(dto.tanggalDaftar)
      : new Date();

    const nasabah = await this.nasabahRepository.createNasabah({
      pegawaiId: pegawai.id,
      nomorAnggota,
      nama: dto.nama,
      nik: dto.nik,
      alamat: dto.alamat,
      noHp: dto.noHp,
      pekerjaan: dto.pekerjaan,
      instansi: dto.instansi,
      penghasilanBulanan: dto.penghasilanBulanan,
      tanggalLahir: new Date(dto.tanggalLahir),
      tanggalDaftar,
      status: NasabahStatus.PENDING,
      catatan: dto.catatan,
    });

    return {
      message: 'Registrasi nasabah berhasil',
      data: nasabah,
    };
  }

  async getAllNasabah(cursor?: number) {
    const { data, nextCursor } = await this.nasabahRepository.findAllNasabah(
      cursor,
      DEFAULT_PAGE_SIZE,
    );
    return {
      message: 'Berhasil mengambil data nasabah',
      data,
      pagination: {
        nextCursor,
        limit: DEFAULT_PAGE_SIZE,
        hasNext: nextCursor !== null,
      },
    };
  }

  async getNasabahById(id: number) {
    const nasabah = await this.nasabahRepository.findNasabahById(id);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil data nasabah',
      data: nasabah,
    };
  }

  async updateNasabah(id: number, dto: UpdateNasabahDto) {
    const nasabah = await this.nasabahRepository.findNasabahById(id);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    const updated = await this.nasabahRepository.updateNasabah(id, {
      ...dto,
      tanggalLahir: dto.tanggalLahir ? new Date(dto.tanggalLahir) : undefined,
    });

    return {
      message: 'Data nasabah berhasil diperbarui',
      data: updated,
    };
  }

  async deleteNasabah(id: number) {
    const nasabah = await this.nasabahRepository.findNasabahById(id);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    await this.nasabahRepository.softDeleteNasabah(id);
    return {
      message: 'Nasabah berhasil dihapus',
    };
  }

  async uploadDokumen(nasabahId: number, files: UploadFiles) {
    const nasabah = await this.nasabahRepository.findNasabahById(nasabahId);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    const ktpFile = files.ktp?.[0];
    const kkFile = files.kk?.[0];
    const slipFile = files.slipGaji?.[0];

    if (!ktpFile) {
      throw new BadRequestException('Dokumen KTP wajib diunggah');
    }

    if (!kkFile) {
      throw new BadRequestException('Dokumen KK wajib diunggah');
    }

    this.validateFile(
      ktpFile,
      ['image/jpeg', 'image/png', 'application/pdf'],
      2,
    );
    this.validateFile(
      kkFile,
      ['image/jpeg', 'image/png', 'application/pdf'],
      2,
    );

    if (slipFile) {
      this.validateFile(slipFile, ['application/pdf'], 5);
    }

    const dokumenUploads: Array<{
      jenis: JenisDokumen;
      file: UploadFile;
    }> = [
      { jenis: JenisDokumen.KTP, file: ktpFile },
      { jenis: JenisDokumen.KK, file: kkFile },
    ];

    if (slipFile) {
      dokumenUploads.push({ jenis: JenisDokumen.SLIP_GAJI, file: slipFile });
    }

    const results: Array<{
      id: number;
      nasabahId: number;
      jenisDokumen: JenisDokumen;
      fileUrl: string;
      uploadedAt: Date;
    }> = [];

    for (const item of dokumenUploads) {
      const bucket = this.minioService.getBucketNameForJenis(item.jenis);
      const safeName = item.file.originalname.replace(/\s+/g, '-');
      const objectName = `nasabah/${nasabahId}/${item.jenis.toLowerCase()}-${Date.now()}-${safeName}`;

      await this.minioService.uploadObject(
        bucket,
        objectName,
        item.file.buffer,
        item.file.mimetype,
      );

      const fileUrl = this.minioService.buildPublicUrl(bucket, objectName);
      const dokumen = await this.nasabahRepository.createNasabahDokumen({
        nasabahId,
        jenisDokumen: item.jenis,
        fileUrl,
      });

      results.push(dokumen);
    }

    return {
      message: 'Upload dokumen berhasil',
      data: results,
    };
  }

  private validateFile(
    file: UploadFile,
    allowedMime: string[],
    maxSizeMb: number,
  ) {
    const size = file.size || file.buffer.length;
    if (size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Ukuran file melebihi ${maxSizeMb}MB`);
    }

    if (!allowedMime.includes(file.mimetype)) {
      throw new BadRequestException('Tipe file tidak sesuai ketentuan');
    }
  }

  async verifikasiNasabah(id: number, dto: VerifikasiNasabahDto) {
    const nasabah = await this.nasabahRepository.findNasabahById(id);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    if (nasabah.status !== NasabahStatus.PENDING) {
      throw new BadRequestException('Nasabah sudah diverifikasi');
    }

    if (
      dto.status !== NasabahStatus.AKTIF &&
      dto.status !== NasabahStatus.DITOLAK
    ) {
      throw new BadRequestException('Status verifikasi tidak valid');
    }

    const updated = await this.nasabahRepository.updateNasabahStatus(
      id,
      dto.status,
      dto.catatan,
    );

    return {
      message: 'Verifikasi nasabah berhasil',
      data: updated,
    };
  }

  async updateStatusNasabah(id: number, dto: UpdateNasabahStatusDto) {
    const nasabah = await this.nasabahRepository.findNasabahById(id);
    if (!nasabah) {
      throw new NotFoundException('Nasabah tidak ditemukan');
    }

    if (
      dto.status !== NasabahStatus.AKTIF &&
      dto.status !== NasabahStatus.NONAKTIF
    ) {
      throw new BadRequestException('Status keanggotaan tidak valid');
    }

    const updated = await this.nasabahRepository.updateNasabahStatus(
      id,
      dto.status,
      nasabah.catatan ?? undefined,
    );

    return {
      message: 'Status nasabah berhasil diperbarui',
      data: updated,
    };
  }
}
