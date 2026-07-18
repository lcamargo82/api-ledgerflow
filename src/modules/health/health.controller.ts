import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retorna status geral da aplicacao' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'api-ledgerflow',
        timestamp: '2026-07-17T00:00:00.000Z',
      },
    },
  })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Valida se o processo da API esta vivo' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readiness')
  @ApiOperation({ summary: 'Valida se a API esta pronta, incluindo banco de dados' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        check: 'readiness',
        database: 'ok',
        timestamp: '2026-07-17T00:00:00.000Z',
      },
    },
  })
  @ApiServiceUnavailableResponse({
    schema: {
      example: {
        status: 'error',
        check: 'readiness',
        database: 'error',
        timestamp: '2026-07-17T00:00:00.000Z',
      },
    },
  })
  getReadiness() {
    return this.healthService.getReadiness();
  }
}
