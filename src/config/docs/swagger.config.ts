import { DocumentBuilder } from '@nestjs/swagger';
import type { ConfigService } from '@nestjs/config';

export function getSwaggerConfig(config: ConfigService) {
  const appName = config.get<string>('APP_NAME') ?? 'ApiLedgerflow';
  const version = config.get<string>('APP_VERSION') ?? '0.1.0';

  return new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription('API NestJS para aplicação mobile, com autenticação JWT e PostgreSQL.')
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .addTag('App')
    .addTag('Auth')
    .addTag('Workspaces')
    .addTag('Institutions')
    .addTag('Accounts')
    .addTag('Dashboard')
    .addTag('Categories')
    .addTag('Transactions')
    .addTag('Health')
    .addTag('Users')
    .build();
}
