import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getInfo() {
    return {
      name: this.config.get<string>('APP_NAME') ?? 'ApiLedgerflow',
      version: this.config.get<string>('APP_VERSION') ?? '0.1.0',
      environment: this.config.get<string>('NODE_ENV') ?? 'development',
    };
  }
}
