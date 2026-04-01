import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { type Queue, type Job } from 'bull';
import { DISPATCH_QUEUE } from '../../common/constants/queues.constant';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(@InjectQueue(DISPATCH_QUEUE) private readonly dispatchQueue: Queue) {}

  async dispatchEmergency(emergencyId: string) {
    this.logger.debug(`Enqueuing emergency dispatch for ID: ${emergencyId}`);
    await this.dispatchQueue.add('dispatch_emergency', {
      emergencyId,
      attempt: 1,
    });
  }
}
