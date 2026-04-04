import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Emergency } from './entities/emergency.entity';
import { EmergencyStatus } from '../../common/enums/emergency-status.enum';
import { DispatchService } from '../dispatch/dispatch.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { CompleteEmergencyDto } from './dto/complete-emergency.dto';

@Injectable()
export class EmergenciesService {
  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    private readonly dispatchService: DispatchService,
  ) {}

  async create(userId: string, data: CreateEmergencyDto) {
    // ── Rate limiting: máx 3 emergencias por usuario por hora ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.emergencyRepo.count({
      where: {
        userId,
        createdAt: MoreThan(oneHourAgo),
      },
    });
    if (recentCount >= 3) {
      throw new BadRequestException(
        'Has alcanzado el límite de 3 emergencias por hora. Por favor, espera antes de crear una nueva.',
      );
    }

    // ── Validar zona de cobertura (Lima/Callao según spec) ──
    const isInRange =
      data.lat >= -12.5 &&
      data.lat <= -11.5 &&
      data.lng >= -77.5 &&
      data.lng <= -76.5;

    if (!isInRange) {
      throw new BadRequestException('Solo operamos en Lima y Callao.');
    }

    const emergency = this.emergencyRepo.create({
      ...data,
      userId,
      userLat: data.lat,
      userLng: data.lng,
      userLocation: {
        type: 'Point',
        coordinates: [data.lng, data.lat],
      },
    });

    const saved = (await this.emergencyRepo.save(
      emergency,
    )) as unknown as Emergency;

    // El "Corazón": activar el despacho automático en segundo plano
    await this.dispatchService.dispatchEmergency(saved.id);

    return saved;
  }

  async findActive(userId: string) {
    return this.emergencyRepo.findOne({
      where: [
        { userId, status: EmergencyStatus.PENDING },
        { userId, status: EmergencyStatus.ASSIGNED },
        { userId, status: EmergencyStatus.ON_ROUTE },
        { userId, status: EmergencyStatus.ARRIVED },
      ],
      relations: ['ambulance', 'ambulance.conductor'],
    });
  }

  async findOne(id: string) {
    const emergency = await this.emergencyRepo.findOne({
      where: { id },
      relations: ['user', 'ambulance', 'ambulance.conductor'],
    });
    if (!emergency) throw new NotFoundException(`Emergency ${id} not found`);
    return emergency;
  }

  async findHistory(userId: string) {
    return this.emergencyRepo.find({
      where: [
        { userId, status: EmergencyStatus.COMPLETED },
        { userId, status: EmergencyStatus.CANCELLED },
      ],
      order: { createdAt: 'DESC' },
      relations: ['ambulance'],
    });
  }

  async findAll() {
    return this.emergencyRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['user', 'ambulance'],
    });
  }

  async cancel(id: string, userId: string) {
    const emergency = await this.findOne(id);
    if (emergency.userId !== userId) {
      throw new ForbiddenException('No puedes cancelar esta emergencia');
    }
    emergency.status = EmergencyStatus.CANCELLED;
    emergency.cancelledAt = new Date();
    return this.emergencyRepo.save(emergency);
  }

  async accept(id: string) {
    const emergency = await this.findOne(id);
    emergency.status = EmergencyStatus.ON_ROUTE;
    emergency.assignedAt = new Date();
    return this.emergencyRepo.save(emergency);
  }

  async arrived(id: string) {
    const emergency = await this.findOne(id);
    emergency.status = EmergencyStatus.ARRIVED;
    emergency.arrivedAt = new Date();
    return this.emergencyRepo.save(emergency);
  }

  async complete(
    id: string,
    conductorUserId: string,
    data: CompleteEmergencyDto,
  ) {
    const emergency = await this.findOne(id);
    emergency.status = EmergencyStatus.COMPLETED;
    emergency.completedAt = new Date();
    emergency.totalAmount = data.totalAmount;
    // platformFee: 12%, companyAmount: 88%
    emergency.platformFee = +(data.totalAmount * 0.12).toFixed(2);
    emergency.companyAmount = +(data.totalAmount * 0.88).toFixed(2);
    return this.emergencyRepo.save(emergency);
  }
}
