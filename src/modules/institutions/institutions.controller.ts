import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListInstitutionsDto } from './dto/list-institutions.dto';
import { InstitutionsService } from './institutions.service';

@ApiTags('Institutions')
@ApiBearerAuth('access-token')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista instituicoes financeiras do catalogo interno',
    description:
      'Retorna bancos, bancos digitais, corretoras, beneficios e meios de pagamento a partir do JSON versionado da API. Aceita filtros por type, search e includeInactive.',
  })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'nubank',
          name: 'Nubank',
          shortName: 'Nu',
          compeCode: '260',
          ispb: '18236120',
          type: 'DIGITAL_BANK',
          icon: 'bank',
          active: true,
        },
      ],
    },
  })
  list(@Query() query: ListInstitutionsDto) {
    return this.institutionsService.list(query);
  }
}
