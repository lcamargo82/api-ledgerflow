import compression from 'compression';
import helmet from 'helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { getRedocHtml } from './config/docs/redoc.html';
import { getSwaggerConfig } from './config/docs/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          connectSrc: ["'self'", 'https://cdn.redoc.ly'],
          imgSrc: ["'self'", 'data:', 'https://cdn.redoc.ly'],
          scriptSrc: ["'self'", 'https://cdn.redoc.ly'],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    }),
  );
  app.use(compression());
  app.enableCors({
    origin: parseCorsOrigins(config.get<string>('CORS_ORIGINS', '*')),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  const swaggerConfig = getSwaggerConfig(config);
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: `${config.get('APP_NAME', 'ApiLedgerflow')} API`,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/openapi.json', (_req: Request, res: Response) => {
    res.json(document);
  });
  httpAdapter.get('/api/reference', (_req: Request, res: Response) => {
    res.type('text/html').send(getRedocHtml(config));
  });

  const host = config.get<string>('API_HOST', '0.0.0.0');
  const port = config.get<number>('API_PORT', config.get<number>('PORT', 3021));

  await app.listen(port, host);
  logger.log(`API listening on http://${host}:${port}`);
}

function parseCorsOrigins(origins: string) {
  if (origins === '*') return true;
  return origins.split(',').map((origin) => origin.trim()).filter(Boolean);
}

bootstrap().catch((error) => {
  console.error('Error starting server', error);
  process.exit(1);
});
