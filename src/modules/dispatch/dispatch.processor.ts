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
    this.logger.debug(`Searching for ambulances within ${maxRadius/1000}km for emergency at [${emergency.userLat}, ${emergency.userLng}]`);
    
    // Log diagnóstico detallado: listar todas las ambulancias 'available'
    const availableAmbs = await this.ambulanceRepo.find({ where: { status: AmbulanceStatus.AVAILABLE, isActive: true } });
    this.logger.debug(`Found ${availableAmbs.length} available ambulances in DB total.`);
    availableAmbs.forEach(amb => {
      this.logger.debug(`Ambulance ${amb.plate}: Lat=${amb.locationLat}, Lng=${amb.locationLng}, HasLocation=${!!amb.location}`);
    });

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
          ST_SetSRID(ST_MakePoint(a."locationLng", a."locationLat"), 4326)::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) AS distance_meters
      FROM ambulances a
      LEFT JOIN users u ON u.id = a."conductorId"
      WHERE a.status = 'available'
        AND a."isActive" = true
        AND a."locationLat" IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(a."locationLng", a."locationLat"), 4326)::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      LIMIT 3
    `,
      [emergency.userLat, emergency.userLng, maxRadius],
    );

    // Validar si encontramos ambulancias pero sin usuario (Data Integrity error)
    if (result.length > 0 && !result[0].conductor_name) {
        this.logger.error(`CRÍTICO: Se encontró la ambulancia ${result[0].plate} pero su conductor (${result[0].conductorId}) NO existe en la base de datos. ELIMINANDO FILTRO DE DISPONIBILIDAD.`);
    }

    if (!result.length) {
      this.logger.warn(`No ambulance found in radius ${maxRadius}m (Attempt ${attempt}/3). Emergency pos: [${emergency.userLat}, ${emergency.userLng}]`);
      // No hay ambulancia disponible — reintentar
      if (attempt < 3) {
        await job.queue.add(
          'dispatch_emergency',
          { emergencyId, attempt: attempt + 1 },
          { delay: 5000 },
        );
        return;
      }
      this.logger.error(`Dispatch failed for ${emergencyId}: No ambulances available within 20km`);
      await this.emergencyRepo.update(emergencyId, {
        status: EmergencyStatus.CANCELLED,
        cancelReason: 'Sin ambulancias disponibles',
      });
      this.trackingGateway.emitToEmergency(emergencyId, SocketEvents.NO_AMBULANCE, {});
      return;
    }

    // 3. SELECCIÓN INTELIGENTE: Comparar ETA real (tráfico) de los candidatos
    this.logger.log(`Evaluating traffic for ${result.length} ambulance candidates for emergency ${emergencyId}`);

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
        ),
      ]);

    const evaluationPromises = result.map(async (candidate) => {
      // Intentar con Google Maps (timeout 5s)
      try {
        const directions = await withTimeout(
          this.routingService.getDirections(
            { lat: candidate.locationLat, lng: candidate.locationLng },
            { lat: emergency.userLat, lng: emergency.userLng },
            RoutingProvider.GOOGLE,
            'TRAFFIC_AWARE_OPTIMAL',
          ),
          5000,
        );
        return {
          ...candidate,
          etaMinutes: Math.ceil(directions.durationSeconds / 60),
          polyline: directions.polyline,
          durationSeconds: directions.durationSeconds,
        };
      } catch {
        // Google falló o tardó >5s — usar OSRM como fallback real
        try {
          const directions = await this.routingService.getDirections(
            { lat: candidate.locationLat, lng: candidate.locationLng },
            { lat: emergency.userLat, lng: emergency.userLng },
            RoutingProvider.OSRM,
          );
          return {
            ...candidate,
            etaMinutes: Math.ceil(directions.durationSeconds / 60),
            polyline: directions.polyline,
            durationSeconds: directions.durationSeconds,
          };
        } catch {
          // OSRM también falló — estimación conservadora basada en distancia
          const conservativeEta = Math.ceil(candidate.distance_meters / 333); // ~20km/h urbano
          return {
            ...candidate,
            etaMinutes: conservativeEta,
            polyline: '',
            durationSeconds: conservativeEta * 60,
          };
        }
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

    // 7.1 NOTIFICACIÓN GLOBAL PARA EL DASHBOARD (Parpadeo)
    this.trackingGateway.emitToAll('emergency_assigned', {
        emergencyId,
        ambulancePlate: ambulance.plate
    });

    // 8. NOTIFICACIÓN GLOBAL (Dashboard): Forzar parpadeo y actualización de mapa
    this.trackingGateway.emitToAll('status_change', {
      ambulanceId: ambulance.id,
      emergencyId,
      status: AmbulanceStatus.ON_ROUTE,
    });
  }
}
