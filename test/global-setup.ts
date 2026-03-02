import { execSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';

export default async function globalSetup() {
  // Load .env file sebelum apapun, agar DATABASE_URL tersedia di seluruh proses Jest
  const envPath = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: envPath });

  process.env.TZ = 'Asia/Jakarta';
  process.env.NODE_ENV = 'test';

  // Validasi DATABASE_URL tersedia
  if (!process.env.DATABASE_URL) {
    throw new Error(
      '❌  DATABASE_URL tidak ditemukan. Pastikan file .env ada di root project.',
    );
  }

  console.log(
    `\n🔗  Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`,
  );

  // Pastikan database test sudah di-migrate
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env },
    });
    console.log('✅  Prisma migrate deploy berhasil');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      '⚠️  Prisma migrate deploy gagal — pastikan PostgreSQL berjalan di DATABASE_URL\n',
      message.slice(0, 300),
    );
  }
}
