import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.enableCsrfProtection();
  // Include failed authentication responses as well as successful responses.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
}
