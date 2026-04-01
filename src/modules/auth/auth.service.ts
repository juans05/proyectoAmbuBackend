import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { User } from '../users/entities/user.entity'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmailWithPassword(email)
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user
      return result as User
    }
    return null
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new BadRequestException('El correo ya está registrado')

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({ ...dto, password: hashedPassword })
    const { password, ...result } = user
    return result
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user)
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10)
    await this.usersService.updateRefreshToken(user.id, hashedRefresh)
    return { ...tokens, user: this.publicUser(user) }
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId)
    if (!user?.refreshToken) throw new UnauthorizedException()
    const valid = await bcrypt.compare(refreshToken, user.refreshToken)
    if (!valid) throw new UnauthorizedException()
    const tokens = await this.generateTokens(user)
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10)
    await this.usersService.updateRefreshToken(user.id, hashedRefresh)
    return tokens
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null)
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role }
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpires'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpires'),
      }),
    ])
    return { accessToken, refreshToken }
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    }
  }
}
