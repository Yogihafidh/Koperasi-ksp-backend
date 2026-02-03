/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - The `id` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NasabahStatus" AS ENUM ('PENDING', 'AKTIF', 'DITOLAK', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "JenisDokumen" AS ENUM ('KTP', 'KK', 'SLIP_GAJI');

-- CreateEnum
CREATE TYPE "JenisSimpanan" AS ENUM ('POKOK', 'WAJIB', 'SUKARELA');

-- CreateEnum
CREATE TYPE "PinjamanStatus" AS ENUM ('PENDING', 'DISETUJUI', 'DITOLAK', 'LUNAS');

-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('SETORAN', 'PENARIKAN', 'PENCAIRAN', 'ANGSURAN');

-- CreateEnum
CREATE TYPE "StatusTransaksi" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('DRAFT', 'FINAL');

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "role",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Pegawai" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "noHp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pegawai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nasabah" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "pegawaiId" INTEGER NOT NULL,
    "nomorAnggota" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "noHp" TEXT NOT NULL,
    "pekerjaan" TEXT NOT NULL,
    "instansi" TEXT,
    "penghasilanBulanan" DECIMAL(65,30) NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "tanggalDaftar" TIMESTAMP(3) NOT NULL,
    "status" "NasabahStatus" NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Nasabah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NasabahDokumen" (
    "id" SERIAL NOT NULL,
    "nasabahId" INTEGER NOT NULL,
    "jenisDokumen" "JenisDokumen" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NasabahDokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RekeningSimpanan" (
    "id" SERIAL NOT NULL,
    "nasabahId" INTEGER NOT NULL,
    "jenisSimpanan" "JenisSimpanan" NOT NULL,
    "saldoBerjalan" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RekeningSimpanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pinjaman" (
    "id" SERIAL NOT NULL,
    "nasabahId" INTEGER NOT NULL,
    "jumlahPinjaman" DECIMAL(65,30) NOT NULL,
    "bungaPersen" DECIMAL(65,30) NOT NULL,
    "tenorBulan" INTEGER NOT NULL,
    "sisaPinjaman" DECIMAL(65,30) NOT NULL,
    "status" "PinjamanStatus" NOT NULL,
    "verifiedById" INTEGER,
    "tanggalPersetujuan" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pinjaman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaksi" (
    "id" SERIAL NOT NULL,
    "nasabahId" INTEGER NOT NULL,
    "pegawaiId" INTEGER NOT NULL,
    "rekeningSimpananId" INTEGER,
    "pinjamanId" INTEGER,
    "jenisTransaksi" "JenisTransaksi" NOT NULL,
    "nominal" DECIMAL(65,30) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "metodePembayaran" TEXT NOT NULL,
    "statusTransaksi" "StatusTransaksi" NOT NULL,
    "urlBuktiTransaksi" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaporanKeuangan" (
    "id" SERIAL NOT NULL,
    "periodeBulan" INTEGER NOT NULL,
    "periodeTahun" INTEGER NOT NULL,
    "totalSimpanan" DECIMAL(65,30) NOT NULL,
    "totalPenarikan" DECIMAL(65,30) NOT NULL,
    "totalPinjaman" DECIMAL(65,30) NOT NULL,
    "totalAngsuran" DECIMAL(65,30) NOT NULL,
    "saldoAkhir" DECIMAL(65,30) NOT NULL,
    "statusLaporan" "StatusLaporan" NOT NULL,
    "generatedById" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaporanKeuangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Pegawai_userId_key" ON "Pegawai"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Nasabah_userId_key" ON "Nasabah"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Nasabah_nomorAnggota_key" ON "Nasabah"("nomorAnggota");

-- CreateIndex
CREATE UNIQUE INDEX "Nasabah_nik_key" ON "Nasabah"("nik");

-- CreateIndex
CREATE INDEX "Transaksi_nasabahId_idx" ON "Transaksi"("nasabahId");

-- CreateIndex
CREATE INDEX "Transaksi_rekeningSimpananId_idx" ON "Transaksi"("rekeningSimpananId");

-- CreateIndex
CREATE INDEX "Transaksi_pinjamanId_idx" ON "Transaksi"("pinjamanId");

-- CreateIndex
CREATE INDEX "Transaksi_tanggal_idx" ON "Transaksi"("tanggal");

-- CreateIndex
CREATE INDEX "AuditTrail_entityName_entityId_idx" ON "AuditTrail"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "AuditTrail_createdAt_idx" ON "AuditTrail"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pegawai" ADD CONSTRAINT "Pegawai_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nasabah" ADD CONSTRAINT "Nasabah_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nasabah" ADD CONSTRAINT "Nasabah_pegawaiId_fkey" FOREIGN KEY ("pegawaiId") REFERENCES "Pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NasabahDokumen" ADD CONSTRAINT "NasabahDokumen_nasabahId_fkey" FOREIGN KEY ("nasabahId") REFERENCES "Nasabah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekeningSimpanan" ADD CONSTRAINT "RekeningSimpanan_nasabahId_fkey" FOREIGN KEY ("nasabahId") REFERENCES "Nasabah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pinjaman" ADD CONSTRAINT "Pinjaman_nasabahId_fkey" FOREIGN KEY ("nasabahId") REFERENCES "Nasabah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pinjaman" ADD CONSTRAINT "Pinjaman_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "Pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_nasabahId_fkey" FOREIGN KEY ("nasabahId") REFERENCES "Nasabah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_pegawaiId_fkey" FOREIGN KEY ("pegawaiId") REFERENCES "Pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_rekeningSimpananId_fkey" FOREIGN KEY ("rekeningSimpananId") REFERENCES "RekeningSimpanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_pinjamanId_fkey" FOREIGN KEY ("pinjamanId") REFERENCES "Pinjaman"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTrail" ADD CONSTRAINT "AuditTrail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanKeuangan" ADD CONSTRAINT "LaporanKeuangan_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
