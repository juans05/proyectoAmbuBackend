import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private app: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKeyRaw = this.configService.get<string>(
        'FIREBASE_PRIVATE_KEY',
      );

      // Los \n en .env se guardan como literales — hay que convertirlos
      const privateKey = privateKeyRaw?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials not configured — push notifications disabled',
        );
        return;
      }

      // Evitar inicializar dos veces (hot reload en dev)
      if (admin.apps.length > 0) {
        this.app = admin.apps[0]!;
        return;
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.logger.log(`Firebase Admin inicializado — proyecto: ${projectId}`);
    } catch (err) {
      this.logger.error('Error al inicializar Firebase Admin', err);
    }
  }

  async sendPush(
    fcmToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<boolean> {
    if (!this.app) {
      this.logger.warn('Firebase no inicializado — notificación omitida');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'emergencias' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      };

      const messageId = await admin.messaging(this.app).send(message);
      this.logger.log(
        `Push enviado — token: ${fcmToken.slice(0, 10)}... id: ${messageId}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Error al enviar push a ${fcmToken.slice(0, 10)}...`,
        err,
      );
      return false;
    }
  }

  async sendMulticast(
    fcmTokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    if (!this.app || !fcmTokens.length) return;

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: 'high' },
    };

    try {
      const response = await admin
        .messaging(this.app)
        .sendEachForMulticast(message);
      this.logger.log(
        `Multicast: ${response.successCount} ok / ${response.failureCount} fallidos`,
      );
    } catch (err) {
      this.logger.error('Error en multicast push', err);
    }
  }
}
