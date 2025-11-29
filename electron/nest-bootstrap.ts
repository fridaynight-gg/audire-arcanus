import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

export async function startNestApp() {
  // Only show errors and warnings in production
  const logLevels: ('error' | 'warn' | 'log')[] =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['error', 'warn', 'log'];

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevels,
  });

  // Enable CORS for browser clients
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Serve static client files from the client directory
  const clientPath = join(__dirname, '..', '..', 'client');

  app.useStaticAssets(clientPath, {
    prefix: '/',
    index: 'index.html',
  });

  await app.listen(5551);

  return app;
}
