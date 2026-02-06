import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PegawaiRepository } from './pegawai.repository';
import { CreatePegawaiDto, UpdatePegawaiDto, TogglePegawaiStatusDto } from './dto';

@Injectable()
export class PegawaiService {
  constructor(private readonly pegawaiRepository: PegawaiRepository) {}

  async createPegawai(dto: CreatePegawaiDto) {
    const user = await this.pegawaiRepository.findUserById(dto.userId);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const existingPegawai = await this.pegawaiRepository.findPegawaiByUserId(
      dto.userId,
    );
    if (existingPegawai) {
      throw new ConflictException('User sudah terdaftar sebagai pegawai');
    }

    const pegawai = await this.pegawaiRepository.createPegawai({
      userId: dto.userId,
      nama: dto.nama,
      jabatan: dto.jabatan,
      noHp: dto.noHp,
      alamat: dto.alamat,
    });

    return {
      message: 'Pegawai berhasil dibuat',
      data: pegawai,
    };
  }

  async getAllPegawai() {
    const data = await this.pegawaiRepository.findAllPegawai();
    return {
      message: 'Berhasil mengambil data pegawai',
      data,
    };
  }

  async getPegawaiById(id: number) {
    const pegawai = await this.pegawaiRepository.findPegawaiById(id);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil data pegawai',
      data: pegawai,
    };
  }

  async updatePegawai(id: number, dto: UpdatePegawaiDto) {
    const pegawai = await this.pegawaiRepository.findPegawaiById(id);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    const updated = await this.pegawaiRepository.updatePegawai(id, dto);
    return {
      message: 'Pegawai berhasil diperbarui',
      data: updated,
    };
  }

  async updatePegawaiStatus(id: number, dto: TogglePegawaiStatusDto) {
    const pegawai = await this.pegawaiRepository.findPegawaiById(id);
    if (!pegawai) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    const updated = await this.pegawaiRepository.updatePegawaiStatus(
      id,
      dto.statusAktif,
    );

    return {
      message: 'Status pegawai berhasil diperbarui',
      data: updated,
    };
  }
}
