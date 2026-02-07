import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PegawaiModule } from './modules/pegawai/pegawai.module';
import { NasabahModule } from './modules/nasabah/nasabah.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    // Setup ConfigModule
    ConfigModule.forRoot({
      isGlobal: true, // Bisa dipakai di semua module tanpa import lagi
      envFilePath: '.env', // Lokasi file .env
      load: [appConfig, jwtConfig, databaseConfig], // Load semua config files
    }),
    AuthModule,
    PegawaiModule,
    NasabahModule,
  ],
})
export class AppModule {}
