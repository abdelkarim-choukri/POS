// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'; // ← ADD
import { join } from 'path';                                        // ← ADD
import { AppModule } from './app.module';

async function bootstrap() {
  // ← Use NestExpressApplication so we can call useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors();

  // ← Serve everything in <project-root>/uploads/** as /uploads/**
  // Files uploaded to uploads/products/xxx.jpg are reachable at
  // http://localhost:3000/uploads/products/xxx.jpg
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`POS Backend running on http://localhost:${port}`);
}
bootstrap();