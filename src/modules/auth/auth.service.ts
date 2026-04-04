import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result as User;
    }
    return null;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('El correo ya está registrado');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    // Generar tokens igual que login() para que el mobile pueda autenticarse inmediatamente
    const tokens = await this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefresh);
    return { ...tokens, user: this.publicUser(user) };
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefresh);
    return { ...tokens, user: this.publicUser(user) };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshToken) throw new UnauthorizedException();
    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException();
    const tokens = await this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefresh);
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpires'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpires'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async findOrCreateSocialUser(data: {
    email: string;
    name: string;
    avatarUrl?: string;
    provider: string;
  }): Promise<User> {
    let user = await this.usersService.findByEmail(data.email);
    if (!user) {
      user = await this.usersService.create({
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        emailVerified: true,
        password: undefined,
      });
    }
    return user;
  }

  async loginSocial(user: User) {
    const tokens = await this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefresh);
    return { ...tokens, user: this.publicUser(user) };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // No revelar si el email existe o no (seguridad)
    if (!user) {
      this.logger.warn(
        `Forgot password solicitado para email inexistente: ${email}`,
      );
      return;
    }

    // Generar token aleatorio seguro
    const rawToken = randomBytes(32).toString('hex');
    // Guardar con prefijo 'reset:' + hash en el campo refreshToken
    const hashed = await bcrypt.hash(rawToken, 10);
    await this.usersService.updateRefreshToken(user.id, `reset:${hashed}`);

    // En dev solo loggear el link — en prod enviar email
    const resetLink = `${this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'}/auth/reset-password?token=${rawToken}&userId=${user.id}`;
    this.logger.log(`[DEV] Reset password link para ${email}: ${resetLink}`);
    console.log(`\n[DEV] RESET PASSWORD LINK:\n${resetLink}\n`);
  }

  async resetPassword(
    rawToken: string,
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshToken?.startsWith('reset:')) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const storedHash = user.refreshToken.slice('reset:'.length);
    const valid = await bcrypt.compare(rawToken, storedHash);
    if (!valid) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, { password: hashedPassword });
    // Limpiar el token de reset
    await this.usersService.updateRefreshToken(user.id, null);
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }
}
