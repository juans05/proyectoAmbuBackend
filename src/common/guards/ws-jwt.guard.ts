import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { UsersService } from '../../modules/users/users.service';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const auth = client.handshake.auth as Record<string, string>;
      const headers = client.handshake.headers as Record<string, string>;
      const token =
        auth['token']?.split(' ')[1] || headers['authorization']?.split(' ')[1];

      if (!token) throw new WsException('Unauthorized');

      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersService.findOne(payload.sub);

      if (!user || !user.isActive) throw new WsException('Unauthorized');

      client.data = { ...(client.data as Record<string, unknown>), user };
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
