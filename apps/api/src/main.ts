import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const config = app.get(ConfigService);
  await app.listen(
    config.getOrThrow<number>('PORT'),
    config.get('NODE_ENV') === 'production' ? '0.0.0.0' : '127.0.0.1',
  );
}
await bootstrap();
