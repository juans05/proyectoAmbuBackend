import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { RouteLog } from './entities/route-log.entity';

@Injectable()
export class RouteAnalyticsService {
  private readonly logger = new Logger(RouteAnalyticsService.name);

  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    @InjectRepository(RouteLog)
    private readonly routeLogRepo: Repository<RouteLog>,
  ) {}

  /**
   * Analiza el desempeño de la ruta una vez finalizada la emergencia.
   * IA: Calcula si el conductor ahorró tiempo respecto a la estimación teórica.
   */
  async analyzeEmergencyRoute(emergencyId: string): Promise<void> {
    const emergency = await this.emergencyRepo.findOne({
      where: { id: emergencyId },
    });

    if (!emergency || !emergency.assignedAt || !emergency.arrivedAt) {
      return;
    }

    // 1. Calcular duración real en segundos
    const actualDurationSeconds = Math.floor(
      (emergency.arrivedAt.getTime() - emergency.assignedAt.getTime()) / 1000,
    );

    // 2. Calcular diferencia respecto al estimado (en segundos)
    const estimatedSeconds = (emergency.estimatedArrivalMinutes || 0) * 60;
    const timeDifferenceSeconds = actualDurationSeconds - estimatedSeconds;

    // 3. Persistir análisis
    await this.emergencyRepo.update(emergencyId, {
      actualDurationSeconds,
      timeDifferenceSeconds,
    });

    // 4. Lógica de "Aprendizaje"
    if (timeDifferenceSeconds < -60) {
      // El conductor ahorró más de 1 minuto respecto a Google Maps
      this.logger.log(
        `[IA Learning] El conductor de la emergencia ${emergencyId} fue ${Math.abs(
          timeDifferenceSeconds,
        )}s más rápido que la ruta sugerida.`,
      );
      
      // Aquí el sistema podría marcar los RouteLogs de esta emergencia como "Ruta Optimizada"
      // para que el motor de despacho la priorice en el futuro.
    }
  }

  /**
   * Obtiene todos los puntos de la ruta real para ser dibujados.
   */
  async getActualRoute(emergencyId: string): Promise<RouteLog[]> {
    return this.routeLogRepo.find({
      where: { emergencyId },
      order: { createdAt: 'ASC' },
    });
  }
}
