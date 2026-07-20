import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/signup.dto';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Cadastra um usuario e retorna um token JWT' })
  @ApiCreatedResponse({
    schema: {
      example: {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
        user: {
          id: 'uuid',
          email: 'leandro@example.com',
          name: 'Leandro Silva',
          active: true,
          tokenVersion: 0,
          createdAt: '2026-07-18T12:00:00.000Z',
          updatedAt: '2026-07-18T12:00:00.000Z',
        },
      },
    },
  })
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um usuario e retorna um token JWT' })
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
        user: {
          id: 'uuid',
          email: 'leandro@example.com',
          name: 'Leandro Silva',
          active: true,
          tokenVersion: 0,
          createdAt: '2026-07-18T12:00:00.000Z',
          updatedAt: '2026-07-18T12:00:00.000Z',
        },
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access token usando um refresh token valido' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoga o token atual e encerra a sessao' })
  logout(@Request() request: AuthenticatedRequest) {
    return this.authService.logout(request.user.sub);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicita instrucoes para recuperacao de senha' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefine a senha usando token de recuperacao' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retorna o usuario autenticado a partir do JWT' })
  @ApiOkResponse({
    schema: {
      example: {
        sub: 'user-id',
        email: 'leandro@example.com',
        tokenVersion: 0,
        onboardingRequired: false,
        currentWorkspace: {
          id: 'workspace-id',
          name: 'Pessoal',
          type: 'PERSONAL',
          currency: 'BRL',
          active: true,
        },
        workspaces: [
          {
            id: 'workspace-id',
            name: 'Pessoal',
            type: 'PERSONAL',
            currency: 'BRL',
            active: true,
          },
        ],
      },
    },
  })
  async me(@Request() request: AuthenticatedRequest) {
    const onboarding = await this.workspacesService.getOnboardingStatus(request.user.sub);

    return {
      ...request.user,
      ...onboarding,
    };
  }
}
