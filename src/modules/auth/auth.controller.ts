import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleAuthDto, FacebookAuthDto } from './dto/social-auth.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

interface GoogleTokenInfo {
  email?: string;
  name?: string;
  picture?: string;
}

interface FacebookUserInfo {
  id?: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

interface JwtDecoded {
  sub?: string;
}
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
  ) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    console.log(user);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const payload = this.authService['jwtService'].decode<JwtDecoded>(
      dto.refreshToken,
    );
    return this.authService.refresh(payload?.sub ?? '', dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usuario autenticado actual' })
  me(@CurrentUser() user: User) {
    return user;
  }

  // ─── OAuth Social ──────────────────────────────────────────────────────────

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con Google (idToken desde app móvil)' })
  async loginGoogle(@Body() dto: GoogleAuthDto) {
    try {
      // Verificar idToken contra Google tokeninfo endpoint
      const { data } = await firstValueFrom(
        this.httpService.get<GoogleTokenInfo>(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${dto.idToken}`,
        ),
      );
      if (!data.email)
        throw new UnauthorizedException('Token de Google inválido');

      const socialUser = await this.authService.findOrCreateSocialUser({
        email: data.email,
        name: data.name ?? data.email.split('@')[0],
        avatarUrl: data.picture,
        provider: 'google',
      });
      return this.authService.loginSocial(socialUser);
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status) throw err;
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }
  }

  @Public()
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con Facebook (accessToken desde app móvil)' })
  async loginFacebook(@Body() dto: FacebookAuthDto) {
    try {
      // Verificar accessToken contra Graph API
      const { data } = await firstValueFrom(
        this.httpService.get<FacebookUserInfo>(
          `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${dto.accessToken}`,
        ),
      );
      if (!data.id)
        throw new UnauthorizedException('Token de Facebook inválido');

      const socialUser = await this.authService.findOrCreateSocialUser({
        email: data.email ?? `fb_${data.id}@ambugo.com`,
        name: data.name ?? `Usuario FB ${data.id}`,
        avatarUrl: data.picture?.data?.url,
        provider: 'facebook',
      });
      return this.authService.loginSocial(socialUser);
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status) throw err;
      throw new UnauthorizedException('Token de Facebook inválido o expirado');
    }
  }

  // ─── Password Reset ────────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar reset de contraseña — envía link al email',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'Si el correo existe, recibirás un link de recuperación.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña con token recibido por email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(
      dto.token,
      dto.userId,
      dto.newPassword,
    );
    return { message: 'Contraseña actualizada correctamente.' };
  }
}
