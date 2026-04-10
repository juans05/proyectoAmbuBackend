import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { DISPATCH_QUEUE } from '../../common/constants/queues.constant';
import { SocketEvents } from '../../common/constants/socket-events.constant';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { AmbulanceStatus } from '../../common/enums/ambulance-status.enum';
import { EmergencyStatus } from '../../common/enums/emergency-status.enum';

interface AmbulanceQueryRow {
  id: string;
  conductorId: string;
  locationLat: number;
  locationLng: number;
  plate: string;
  type: string;
  fcmToken: string | null;
  conductor_name: string;
  distance_meters: number;
}
import { NotificationsService } from '../notifications/notifications.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { RoutingService, RoutingProvider } from './routing.service';

@Processor(DISPATCH_QUEUE)
export class DispatchProcessor {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    private readonly notificationsService: NotificationsService,
    private readonly trackingGateway: TrackingGateway,
    private readonly routingService: RoutingService,
    private readonly dataSource: DataSource,
  ) {}

  @Process('dispatch_emergency')
  async handleDispatch(job: Job<{ emergencyId: string; attempt: number }>) {
    const { emergencyId, attempt } = job.data;
    const maxRadius = attempt === 1 ? 5000 : attempt === 2 ? 10000 : 20000; // m

    // 1. Obtener emergencia
    const emergency = await this.emergencyRepo.findOne({
      where: { id: emergencyId },
      relations: ['user'],
    });
    if (!emergency || emergency.status !== EmergencyStatus.PENDING) return;

    // 2. Buscar ambulancia más cercana con PostGIS
    const result = await this.dataSource.query<AmbulanceQueryRow[]>(
      `
      SELECT
        a.id,
        a."conductorId",
        a."locationLat",
        a."locationLng",
        a.plate,
        a.type,
        u."fcmToken",
        u.name as conductor_name,
        ST_Distance(
          a.location::geography,
          ST_MakePoint($2, $1)::geography
        ) AS distance_meters
      FROM ambulances a
      INNER JOIN users u ON u.id = a."conductorId"
      WHERE a.status = 'available'
        AND a."isActive" = true
        AND a.location IS NOT NULL
        AND ST_DWithin(
          a.location::geography,
          ST_MakePoint($2, $1)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      LIMIT 5
    `,
      [emergency.userLat, emergency.userLng, maxRadius],
    );

    if (!result.length) {
      // No hay ambulancia disponible — reintentar
      if (attempt < 3) {
        await job.queue.add(
          'dispatch_emergency',
          { emergencyId, attempt: attempt + 1 },
          { delay: 5000 },
        );
        return;
      }
      await this.emergencyRepo.update(emergencyId, {
        status: EmergencyStatus.CANCELLED,
        cancelReason: 'Sin ambulancias disponibles',
      });
      this.trackingGateway.emitToEmergency(emergencyId, SocketEvents.NO_AMBULANCE, {});
      return;
    }

    // 3. SELECCIÓN INTELIGENTE: Comparar ETA real (tráfico) de los candidatos
    this.logger.log(`Evaluating traffic for ${result.length} ambulance candidates for emergency ${emergencyId}`);
    
    const evaluationPromises = result.map(async (candidate) => {
      try {
        const directions = await this.routingService.getDirections(
          { lat: candidate.locationLat, lng: candidate.locationLng },
          { lat: emergency.userLat, lng: emergency.userLng },
          RoutingProvider.GOOGLE, // Forzamos Google para tener tráfico real en la comparativa
          'TRAFFIC_AWARE_OPTIMAL'
        );
        return {
          ...candidate,
          etaMinutes: Math.ceil(directions.durationSeconds / 60),
          polyline: directions.polyline,
          durationSeconds: directions.durationSeconds,
        };
      } catch (error) {
        // Fallback a OSRM o cálculo lineal si Google falla para este candidato
        const linearEta = Math.ceil(candidate.distance_meters / 500); // ~30km/h
        return {
          ...candidate,
          etaMinutes: linearEta,
          polyline: '',
          durationSeconds: linearEta * 60,
        };
      }
    });

    const evaluatedCandidates = await Promise.all(evaluationPromises);
    
    // Ordenar por duración real (orden ascendente)
    evaluatedCandidates.sort((a, b) => a.durationSeconds - b.durationSeconds);
    
    const ambulance = evaluatedCandidates[0];
    const { etaMinutes: eta, polyline } = ambulance;

    this.logger.log(`Optimal ambulance selected: ${ambulance.plate} (ETA: ${eta} min, GeoDistance: ${Math.round(ambulance.distance_meters)}m)`);

    // 4. Asignar ambulancia — transacción para evitar doble asignación
    await this.dataSource.transaction(async (manager) => {
      // Bloquear fila para evitar condición de carrera
      const locked = await manager.query<Array<{ id: string }>>(
        `
        SELECT id FROM ambulances WHERE id = $1 AND status = 'available'
        FOR UPDATE SKIP LOCKED
      `,
        [ambulance.id],
      );

      if (!locked.length) {
        throw new Error('Ambulance taken by another emergency, retrying...');
      }

      await manager.update(Ambulance, ambulance.id, {
        status: AmbulanceStatus.ON_ROUTE,
      });
      await manager.update(Emergency, emergencyId, {
        ambulanceId: ambulance.id,
        status: EmergencyStatus.ASSIGNED,
        estimatedArrivalMinutes: eta,
        suggestedRoutePolyline: polyline,
        assignedAt: new Date(),
      });
    });

    // 5. Notificar al conductor via Firebase Push
    if (ambulance.fcmToken) {
      await this.notificationsService.sendPush(ambulance.fcmToken, {
        title: '🚨 Nueva emergencia',
        body: `${emergency.type === 'critical' ? 'CRÍTICA' : 'Urgente'} — ${emergency.address}`,
        data: {
          type: 'NEW_EMERGENCY',
          emergencyId,
          polyline, // Nueva: ruta teórica de Google
          userLat: String(emergency.userLat),
          userLng: String(emergency.userLng),
          userName: emergency.user.name,
          bloodType: emergency.user.bloodType || 'No indicado',
          allergies: emergency.user.allergies || 'Ninguna',
        },
      });
    }

    // 6. Notificar al conductor via WebSocket (INSTANTÁNEO si la app está abierta)
    this.trackingGateway.emitToUser(ambulance.conductorId, 'new_emergency', {
      emergencyId,
      polyline,
      userLat: emergency.userLat,
      userLng: emergency.userLng,
      userName: emergency.user.name,
      bloodType: emergency.user.bloodType || '—',
      allergies: emergency.user.allergies || 'Ninguna',
      address: emergency.address,
    });

    // 7. Notificar al usuario via WebSocket
    this.trackingGateway.emitToEmergency(emergencyId, 'emergency_assigned', {
      ambulanceId: ambulance.id,
      conductorName: ambulance.conductor_name,
      plate: ambulance.plate,
      type: ambulance.type,
      estimatedArrivalMinutes: eta,
      polyline, // Incluir la ruta para que el cliente la dibuje
      ambulanceLat: ambulance.locationLat,
      ambulanceLng: ambulance.locationLng,
    });
  }
}
