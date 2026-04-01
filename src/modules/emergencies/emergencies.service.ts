import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emergency } from './entities/emergency.entity';
import { DispatchService } from '../dispatch/dispatch.service';

@Injectable()
export class EmergenciesService {
  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    private readonly dispatchService: DispatchService,
  ) {}

  async create(userId: string, data: any) {
    const emergency = this.emergencyRepo.create({
      ...data,
      userId,
      userLocation: {
        type: 'Point',
        coordinates: [parseFloat(data.lng), parseFloat(data.lat)],
      },
    });
    
    const saved = (await this.emergencyRepo.save(emergency) as unknown) as Emergency;
    
    // El "Corazón": activar el despacho automático en segundo plano
    await this.dispatchService.dispatchEmergency(saved.id);
    
    return saved;
  }

  async findActive(userId: string) {
    return this.emergencyRepo.findOne({
      where: [
        { userId, status: 'pending' as any },
        { userId, status: 'assigned' as any },
        { userId, status: 'on_route' as any },
        { userId, status: 'arrived' as any },
      ],
      relations: ['ambulance', 'ambulance.conductor'],
    });
  }

  async findOne(id: string) {
    return this.emergencyRepo.findOne({
      where: { id },
      relations: ['user', 'ambulance', 'ambulance.conductor'],
    });
  }
}
