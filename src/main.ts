import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ambil ConfigService untuk baca config
  const configService = app.get(ConfigService);

  // Setup Global Validation Pipe untuk DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Hapus property yang tidak ada di DTO
      forbidNonWhitelisted: true, // Throw error jika ada property tidak dikenal
      transform: true, // Auto transform payload ke DTO instance
    }),
  );

  const corsEnabled = configService.get<boolean>('app.corsEnabled');
  if (corsEnabled) {
    app.enableCors({
      origin: configService.get<string>('app.corsOrigin'),
      credentials: true,
    });
  }

  // Setup Global Prefix dari config
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Setup Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Koperasi API')
    .setDescription('API Documentation untuk Sistem Manajemen Koperasi')
    .setVersion('1.0')
    .addTag('auth', 'Authentication & Authorization')
    .addTag('users', 'User Management')
    .addTag('roles', 'Role Management')
    .addTag('permissions', 'Permission Management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Koperasi API Docs',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Jalankan aplikasi di port dari config
  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  // Log informasi startup
  console.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  console.log(
    `📚 Swagger Documentation: http://localhost:${port}/api-docs`,
  );
  console.log(`📝 Environment: ${configService.get<string>('app.nodeEnv')}`);
}
void bootstrap();
