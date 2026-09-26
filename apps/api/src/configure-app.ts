import { type INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
