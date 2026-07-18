import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retorna informações públicas da API' })
  @ApiOkResponse({
    schema: {
      example: {
        name: 'ApiLedgerflow',
        version: '0.1.0',
        environment: 'development',
      },
    },
  })
  getInfo() {
    return this.appService.getInfo();
  }
}
