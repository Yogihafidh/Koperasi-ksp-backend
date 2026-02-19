// Auth Module Seeder
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting auth seed...');

  try {
    // Create Permissions
    console.log('1. Creating permissions...');
    const permissions = [
      // User permissions
      { code: 'user.create', description: 'Create user' },
      { code: 'user.read', description: 'Read user' },
      { code: 'user.update', description: 'Update user' },
      { code: 'user.delete', description: 'Delete user' },

      // Role permissions
      { code: 'role.create', description: 'Create role' },
      { code: 'role.read', description: 'Read role' },
      { code: 'role.update', description: 'Update role' },
      { code: 'role.delete', description: 'Delete role' },

      // Permission permissions
      { code: 'permission.create', description: 'Create permission' },
      { code: 'permission.read', description: 'Read permission' },
      { code: 'permission.delete', description: 'Delete permission' },

      // Nasabah permissions
      { code: 'nasabah.create', description: 'Create nasabah' },
      { code: 'nasabah.read', description: 'Read nasabah' },
      { code: 'nasabah.update', description: 'Update nasabah' },
      { code: 'nasabah.delete', description: 'Delete nasabah' },

      // Pegawai permissions
      { code: 'pegawai.create', description: 'Create pegawai' },
      { code: 'pegawai.read', description: 'Read pegawai' },
      { code: 'pegawai.update', description: 'Update pegawai' },
      { code: 'pegawai.delete', description: 'Delete pegawai' },

      // Simpanan permissions
      { code: 'simpanan.read', description: 'Read simpanan' },
      { code: 'simpanan.setor', description: 'Setor simpanan' },
      { code: 'simpanan.tarik', description: 'Tarik simpanan' },

      // Pinjaman permissions
      { code: 'pinjaman.ajukan', description: 'Ajukan pinjaman' },
      { code: 'pinjaman.read', description: 'Read pinjaman' },
      { code: 'pinjaman.verify', description: 'Verifikasi pinjaman' },
      { code: 'pinjaman.cairkan', description: 'Pencairan pinjaman' },
      { code: 'pinjaman.angsuran', description: 'Bayar angsuran pinjaman' },

      // Transaksi permissions
      { code: 'transaksi.create', description: 'Create transaksi' },
      { code: 'transaksi.read', description: 'Read transaksi' },
      { code: 'transaksi.process', description: 'Process transaksi' },

      // Laporan permissions
      { code: 'laporan.read', description: 'Read laporan' },
      { code: 'laporan.generate', description: 'Generate laporan' },
      { code: 'laporan.finalize', description: 'Finalize laporan' },

      // Dashboard permissions
      { code: 'dashboard.read', description: 'Read dashboard' },

      // Settings permissions
      { code: 'settings.read', description: 'Read settings' },
      { code: 'settings.update', description: 'Update settings' },
    ];

    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: {},
        create: permission,
      });
    }
    console.log(`Created ${permissions.length} permissions`);

    const defaultSettings = [
      {
        key: 'loan.maxTenorMonths',
        value: '24',
        valueType: 'NUMBER',
        description: 'Batas maksimum tenor pinjaman (bulan)',
      },
      {
        key: 'loan.minTenorMonths',
        value: '3',
        valueType: 'NUMBER',
        description: 'Batas minimum tenor pinjaman (bulan)',
      },
      {
        key: 'loan.maxLoanAmount',
        value: '50000000',
        valueType: 'NUMBER',
        description: 'Batas maksimum nominal pinjaman per pengajuan',
      },
      {
        key: 'loan.defaultInterestPercent',
        value: '2.5',
        valueType: 'NUMBER',
        description: 'Bunga pinjaman default dalam persen',
      },
      {
        key: 'loan.autoApprovalLimit',
        value: '3000000',
        valueType: 'NUMBER',
        description: 'Batas nominal pinjaman untuk auto approval',
      },
      {
        key: 'savings.minInitialDeposit',
        value: '50000',
        valueType: 'NUMBER',
        description: 'Setoran awal minimum saat membuka simpanan',
      },
      {
        key: 'savings.minMonthlyDeposit',
        value: '25000',
        valueType: 'NUMBER',
        description: 'Setoran bulanan minimum simpanan wajib',
      },
      {
        key: 'savings.allowWithdrawalIfLoanActive',
        value: 'false',
        valueType: 'BOOLEAN',
        description: 'Izin tarik simpanan saat pinjaman masih aktif',
      },
      {
        key: 'transaction.maxDailyNominal',
        value: '100000000',
        valueType: 'NUMBER',
        description: 'Batas total nominal transaksi harian per anggota',
      },
      {
        key: 'dashboard.trendMonths',
        value: '6',
        valueType: 'NUMBER',
        description: 'Jumlah bulan yang ditampilkan pada tren dashboard',
      },
    ];

    for (const item of defaultSettings) {
      await prisma.setting.upsert({
        where: { key: item.key },
        update: {
          value: item.value,
          valueType: item.valueType,
          description: item.description,
        },
        create: item,
      });
    }
    console.log(`Created ${defaultSettings.length} default settings`);

    // Create Roles
    console.log('2. Creating roles...');
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        description: 'Administrator dengan akses penuh',
      },
    });

    const kasirRole = await prisma.role.upsert({
      where: { name: 'Kasir' },
      update: {},
      create: {
        name: 'Kasir',
        description: 'Kasir yang menangani transaksi harian',
      },
    });

    const staffRole = await prisma.role.upsert({
      where: { name: 'Staff' },
      update: {},
      create: {
        name: 'Staff',
        description: 'Staff koperasi',
      },
    });

    const pimpinanRole = await prisma.role.upsert({
      where: { name: 'Pimpinan' },
      update: {},
      create: {
        name: 'Pimpinan',
        description: 'Pimpinan koperasi',
      },
    });

    console.log('Created roles: Admin, Kasir, Staff, Pimpinan');

    // Assign all permissions to Admin
    console.log('3.1 Assigning permissions to Admin role...');
    const allPermissions = await prisma.permission.findMany();
    await prisma.rolePermission.deleteMany({
      where: { roleId: adminRole.id },
    });
    await prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: adminRole.id,
        permissionId: p.id,
      })),
    });
    console.log(`Assigned ${allPermissions.length} permissions to Admin`);

    // Assign specific permissions to Kasir
    console.log('3.2 Assigning permissions to Kasir role...');
    const kasirPermissionCodes = [
      'nasabah.read',
      'simpanan.read',
      'simpanan.setor',
      'simpanan.tarik',
      'pinjaman.read',
      'pinjaman.cairkan',
      'pinjaman.angsuran',
      'transaksi.create',
      'transaksi.read',
      'dashboard.read',
    ];
    const kasirPermissions = await prisma.permission.findMany({
      where: { code: { in: kasirPermissionCodes } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: kasirRole.id },
    });
    await prisma.rolePermission.createMany({
      data: kasirPermissions.map((p) => ({
        roleId: kasirRole.id,
        permissionId: p.id,
      })),
    });
    console.log(`Assigned ${kasirPermissions.length} permissions to Kasir`);

    // Assign specific permissions to Staff
    console.log('3.3 Assigning permissions to Staff role...');
    const staffPermissionCodes = [
      'nasabah.create',
      'nasabah.read',
      'nasabah.update',
      'pegawai.read',
      'simpanan.read',
      'pinjaman.ajukan',
      'pinjaman.read',
      'transaksi.read',
    ];
    const staffPermissions = await prisma.permission.findMany({
      where: { code: { in: staffPermissionCodes } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: staffRole.id },
    });
    await prisma.rolePermission.createMany({
      data: staffPermissions.map((p) => ({
        roleId: staffRole.id,
        permissionId: p.id,
      })),
    });
    console.log(`Assigned ${staffPermissions.length} permissions to Staff`);

    // Assign specific permissions to Pimpinan
    console.log('3.4 Assigning permissions to Pimpinan role...');
    const pimpinanPermissionCodes = [
      'nasabah.read',
      'pegawai.read',
      'simpanan.read',
      'pinjaman.read',
      'pinjaman.verify',
      'transaksi.read',
      'transaksi.process',
      'laporan.read',
      'laporan.generate',
      'laporan.finalize',
      'dashboard.read',
    ];
    const pimpinanPermissions = await prisma.permission.findMany({
      where: { code: { in: pimpinanPermissionCodes } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: pimpinanRole.id },
    });
    await prisma.rolePermission.createMany({
      data: pimpinanPermissions.map((p) => ({
        roleId: pimpinanRole.id,
        permissionId: p.id,
      })),
    });
    console.log(
      `Assigned ${pimpinanPermissions.length} permissions to Pimpinan`,
    );

    // Create default admin user
    console.log('Creating default admin user...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@koperasi.com',
        password: hashedPassword,
        isActive: true,
      },
    });

    await prisma.userRole.deleteMany({
      where: { userId: adminUser.id },
    });
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

    console.log('Created default admin user');
    console.log('Username: admin');
    console.log('Email: admin@koperasi.com');
    console.log('Password: Admin@123');
    console.log('Auth seed completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
