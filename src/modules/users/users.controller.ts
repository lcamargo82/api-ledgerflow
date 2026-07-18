import { Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Retorna o perfil do usuario autenticado' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        email: 'leandro@example.com',
        name: 'Leandro Silva',
        active: true,
        tokenVersion: 0,
        createdAt: '2026-07-18T12:00:00.000Z',
        updatedAt: '2026-07-18T12:00:00.000Z',
      },
    },
  })
  getProfile(@Request() request: AuthenticatedRequest) {
    return this.usersService.getProfile(request.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Atualiza o perfil do usuario autenticado' })
  updateProfile(@Request() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(request.user.sub, dto);
  }
}
