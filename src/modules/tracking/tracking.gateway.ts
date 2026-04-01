import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'; // I'll need to create this for WS
import { SocketEvents } from '../../common/constants/socket-events.constant';

@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: '*' },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(SocketEvents.UPDATE_LOCATION)
  handleUpdateLocation(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.debug(`Location update from ${client.id}: ${JSON.stringify(data)}`);
    // Emitir a la sala de la emergencia si corresponde
    if (data.emergencyId) {
      this.server.to(`emergency_${data.emergencyId}`).emit(SocketEvents.AMBULANCE_LOCATION, data);
    }
  }

  @SubscribeMessage(SocketEvents.JOIN_EMERGENCY)
  handleJoinEmergency(@MessageBody() data: { emergencyId: string }, @ConnectedSocket() client: Socket) {
    client.join(`emergency_${data.emergencyId}`);
    this.logger.debug(`Client ${client.id} joined emergency_${data.emergencyId}`);
  }

  async emitToEmergency(emergencyId: string, event: string, data: any) {
    this.server.to(`emergency_${emergencyId}`).emit(event, data);
  }
}
