import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Intersection, IntersectionType } from './entities/intersection.entity';
import { Server } from 'socket.io';

@Injectable()
export class PriorityEngineService {
  private readonly logger = new Logger(PriorityEngineService.name);
  private lastNotified = new Map<string, string>(); // ambulanceId -> intersectionId

  constructor(
    @InjectRepository(Intersection)
    private readonly intersectionRepo: Repository<Intersection>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Detecta si hay intersecciones semaforizadas en el camino de la ambulancia.
   * IA: Radio de 400m es el óptimo para "limpiar" el cruce antes de llegar.
   */
  async checkPriority(
    ambulanceId: string,
    lat: number,
    lng: number,
    emergencyId: string,
    server: Server,
  ) {
    try {
      const radius = 400; // metros

      // Búsqueda espacial de la intersección más cercana (PostGIS)
      const result = await this.dataSource.query<Array<{ id: string; name: string; distance: number }>>(
        `
        SELECT
          id,
          name,
          ST_Distance(
            location::geography,
            ST_MakePoint($2, $1)::geography
          ) AS distance
        FROM intersections
        WHERE "isActive" = true
          AND ST_DWithin(
            location::geography,
            ST_MakePoint($2, $1)::geography,
            $3
          )
        ORDER BY distance ASC
        LIMIT 1
      `,
        [lat, lng, radius],
      );

      if (result.length > 0) {
        const intersection = result[0];
        const cacheKey = `${ambulanceId}_${emergencyId}`;

        // Evitar spam de notificaciones para la misma intersección
        if (this.lastNotified.get(cacheKey) !== intersection.id) {
          this.lastNotified.set(cacheKey, intersection.id);

          this.logger.log(
            `[PRIORITY ACTIVE] Ambulancia ${ambulanceId} llegando a ${intersection.name}. Activando túnel virtual.`,
          );

          // Emitir a la sala de la emergencia
          server.to(`emergency_${emergencyId}`).emit('traffic_priority_active', {
            ambulanceId,
            intersectionId: intersection.id,
            intersectionName: intersection.name,
            type: IntersectionType.TRAFFIC_LIGHT,
            status: 'clearing',
          });

          // Limpiar caché después de un tiempo razonable para permitir volver a la misma zona si es necesario
          setTimeout(() => this.lastNotified.delete(cacheKey), 60000);
        }
      }
    } catch (err) {
      this.logger.error('Error en el PriorityEngine', err);
    }
  }
}
