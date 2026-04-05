import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  role: string;
}

interface SocketData {
  userId: string;
  role: string;
  ambulanceId?: string;
}
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { AmbulanceStatus } from '../../common/enums/ambulance-status.enum';
import { SocketEvents } from '../../common/constants/socket-events.constant';
import { RouteLog } from './entities/route-log.entity';

@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: '*' },
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  // Mapeo socketId → userId para gestionar desconexiones
  private readonly socketToUser = new Map<string, string>();
  // Mapeo userId → socketId para verificar reconexiones en grace period
  private readonly userToSocket = new Map<string, string>();
  // Timers de grace period por userId
  private readonly disconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisClient: Redis,
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    @InjectRepository(RouteLog)
    private readonly routeLogRepo: Repository<RouteLog>,
  ) { }

  // ─── Conexión con JWT en handshake ──────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const auth = client.handshake.auth as Record<string, string | undefined>;
      const headers = client.handshake.headers as Record<
        string,
        string | undefined
      >;
      const rawToken: string | undefined =
        auth['token'] ?? headers['authorization'];

      const token: string | undefined = rawToken?.startsWith('Bearer ')
        ? rawToken.slice(7)
        : rawToken;

      if (!token || token === 'undefined') {
        this.logger.warn(`Conexión rechazada (token ausente o "undefined"): client=${client.id} token=${token}`);
        client.disconnect(true);
        return;
      }

      this.logger.debug(
        `Token recibido para validación: len=${token.length}, start=${token.substring(
          0,
          10,
        )}..., end=...${token.substring(token.length - 10)}`,
      );

      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }

      // Guardar userId en el socket para uso posterior
      const data: SocketData = { userId: payload.sub, role: payload.role };

      // Si es conductor, precargar su ambulanceId para ahorrar queries luego
      if (payload.role === 'conductor') {
        const amb = await this.ambulanceRepo.findOne({
          where: { conductorId: payload.sub },
        });
        if (amb) data.ambulanceId = amb.id;
      }

      client.data = data;

      // Si el conductor reconectó antes de que expirara el grace period, cancelarlo
      if (this.disconnectTimers.has(payload.sub)) {
        clearTimeout(this.disconnectTimers.get(payload.sub));
        this.disconnectTimers.delete(payload.sub);
        this.logger.debug(
          `Grace period cancelado — conductor ${payload.sub} reconectó`,
        );
      }

      this.socketToUser.set(client.id, payload.sub);
      this.userToSocket.set(payload.sub, client.id);

      this.logger.debug(
        `Cliente conectado: ${client.id} (userId: ${payload.sub})`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Conexión rechazada (token inválido): ${client.id} - Razón: ${error.message || 'Desconocida'
        }`,
      );
      client.disconnect(true);
    }
  }

  // ─── Desconexión con grace period de 30s para conductores ───────────────────

  handleDisconnect(client: Socket): void {
    const userId = this.socketToUser.get(client.id);
    this.socketToUser.delete(client.id);

    if (!userId) return;

    this.logger.debug(`Cliente desconectado: ${client.id} (userId: ${userId})`);

    // Grace period: esperar 30s antes de marcar offline (tolera reconexiones rápidas)
    const markOffline = async (): Promise<void> => {
      this.disconnectTimers.delete(userId);

      // Verificar si el usuario reconectó en otro socket
      const currentSocketId = this.userToSocket.get(userId);
      if (currentSocketId && currentSocketId !== client.id) {
        this.logger.debug(
          `Conductor ${userId} ya reconectó en socket ${currentSocketId}, no se marca offline`,
        );
        return;
      }

      this.userToSocket.delete(userId);

      // Marcar ambulancia como offline en BD
      try {
        await this.ambulanceRepo.update(
          { conductorId: userId },
          { status: AmbulanceStatus.OFFLINE },
        );
        this.logger.log(
          `Ambulancia del conductor ${userId} marcada OFFLINE tras grace period`,
        );
      } catch (err) {
        this.logger.error(
          `Error al marcar offline ambulancia del conductor ${userId}`,
          err,
        );
      }
    };

    const timer = setTimeout(() => {
      void markOffline();
    }, 30_000);
    this.disconnectTimers.set(userId, timer);
  }

  // ─── Update location con throttle Redis (1 update/seg por conductor) ─────────

  @SubscribeMessage(SocketEvents.UPDATE_LOCATION)
  async handleUpdateLocation(
    @MessageBody()
    data: {
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
      emergencyId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId: string = (client.data as SocketData)?.userId;
    if (!userId) return;

    // Throttle: máx 1 update por segundo por conductor
    const throttleKey = `throttle:location:${userId}`;
    const exists = await this.redisClient.exists(throttleKey);
    if (exists) {
      // Silenciosamente ignorar — no enviar error al cliente para no saturar
      return;
    }
    await this.redisClient.set(throttleKey, '1', 'PX', 1000);

    // Persistir ubicación en BD (PostGIS: ST_MakePoint(lng, lat))
    try {
      await this.ambulanceRepo
        .createQueryBuilder()
        .update(Ambulance)
        .set({
          locationLat: data.lat,
          locationLng: data.lng,
          locationUpdatedAt: () => 'NOW()',
          location: () => `ST_MakePoint(${data.lng}, ${data.lat})`,
        })
        .where('"conductorId" = :userId', { userId })
        .execute();

      // IA: Si hay una emergencia activa, guardar en el historial (breadcrumb)
      if (data.emergencyId) {
        const ambulanceId = (client.data as SocketData)?.ambulanceId;
        if (ambulanceId) {
          void this.routeLogRepo.save({
            emergencyId: data.emergencyId,
            ambulanceId,
            lat: data.lat,
            lng: data.lng,
            heading: data.heading,
            speed: data.speed,
            location: {
              type: 'Point',
              coordinates: [data.lng, data.lat],
            },
          });
        }
      }
    } catch (err) {
      this.logger.error(
        `Error al persistir ubicación/historial del conductor ${userId}`,
        err,
      );
    }

    const ambulanceId = (client.data as SocketData)?.ambulanceId;

    // Emitir a la sala de la emergencia activa si corresponde
    if (data.emergencyId) {
      this.server
        .to(`emergency_${data.emergencyId}`)
        .emit(SocketEvents.AMBULANCE_LOCATION, {
          ambulanceId,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          speed: data.speed,
        });
    }

    // EMISION GLOBAL (Dashboard): Para que el mapa administrativo vea el movimiento en tiempo real
    this.server.emit(SocketEvents.AMBULANCE_LOCATION, {
      ambulanceId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      speed: data.speed,
    });

    this.logger.log(
      `[GPS WS] Update: userId=${userId} ambId=${ambulanceId} lat=${data.lat} lng=${data.lng}`,
    );
  }

  // ─── Join emergency room ──────────────────────────────────────────────────────

  @SubscribeMessage(SocketEvents.JOIN_EMERGENCY)
  handleJoinEmergency(
    @MessageBody() data: { emergencyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`emergency_${data.emergencyId}`);
    this.logger.debug(
      `Cliente ${client.id} unido a emergency_${data.emergencyId}`,
    );
  }

  // ─── Leave emergency room ─────────────────────────────────────────────────────

  @SubscribeMessage(SocketEvents.LEAVE_EMERGENCY)
  handleLeaveEmergency(
    @MessageBody() data: { emergencyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`emergency_${data.emergencyId}`);
    this.logger.debug(
      `Cliente ${client.id} salió de emergency_${data.emergencyId}`,
    );
  }

  // ─── Método público para otros servicios (dispatch, etc.) ────────────────────

  emitToEmergency(
    emergencyId: string,
    event: string,
    data: Record<string, unknown>,
  ) {
    this.server.to(`emergency_${emergencyId}`).emit(event, data);
  }

  /**
   * Envía un evento a un usuario específico (ej: conductor asignado)
   */
  emitToUser(userId: string, event: string, data: Record<string, unknown>) {
    const socketId = this.userToSocket.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      this.logger.debug(`Evento ${event} enviado al usuario ${userId} (${socketId})`);
    } else {
      this.logger.warn(`No se pudo enviar ${event} al usuario ${userId}: Socket no encontrado`);
    }
  }
}
