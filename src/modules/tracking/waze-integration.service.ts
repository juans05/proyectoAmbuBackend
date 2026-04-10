import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { EmergencyStatus } from '../../common/enums/emergency-status.enum';

@Injectable()
export class WazeIntegrationService {
  private readonly logger = new Logger(WazeIntegrationService.name);

  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
  ) {}

  /**
   * Genera un feed JSON compatible con Waze para ciudades (CIFS / Alerts).
   * Muestra las ambulancias que se desplazan activamente a una emergencia.
   */
  async getWazeFeed() {
    try {
      // Obtener emergencias activas con ambulancia asignada
      const activeEmergencies = await this.emergencyRepo.find({
        where: [
          { status: EmergencyStatus.ASSIGNED },
          { status: EmergencyStatus.ON_ROUTE },
        ],
        relations: ['ambulance', 'user'],
      });

      return {
        alerts: activeEmergencies.map((em) => ({
          uuid: em.id,
          type: 'ACCIDENT', // Waze agrupa emergencias aquí o en ROAD_CLOSED
          subtype: 'ACCIDENT_MAJOR',
          location: {
            x: em.ambulance?.locationLng || em.userLng,
            y: em.ambulance?.locationLat || em.userLat,
          },
          street: em.address,
          city: 'Lima',
          reportDescription: `🚨 VEHÍCULO DE EMERGENCIA EN RUTA. Ceda el paso: Ambulancia ${em.ambulance?.plate || ''}`,
          startTime: em.assignedAt || em.createdAt,
          confidenceScore: 5,
        })),
      };
    } catch (err) {
      this.logger.error('Error al generar el feed de Waze', err);
      return { alerts: [] };
    }
  }
}
