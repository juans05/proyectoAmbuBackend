import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendPush(fcmToken: string, payload: { title: string; body: string; data?: any }) {
    this.logger.debug(`Sending push to ${fcmToken}: ${payload.title}`);
    // Aquí iría la integración con firebase-admin que ya instalamos
    return true;
  }
}
