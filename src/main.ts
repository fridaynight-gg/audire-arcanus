import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for browser clients
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 5551);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
