import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { DISPATCH_QUEUE } from '../../common/constants/queues.constant'
import { Ambulance } from '../ambulances/entities/ambulance.entity'
import { Emergency } from '../emergencies/entities/emergency.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { TrackingGateway } from '../tracking/tracking.gateway'
import { GoogleMapsService } from '../../common/utils/google-maps.service'

@Processor(DISPATCH_QUEUE)
export class DispatchProcessor {
  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    private readonly notificationsService: NotificationsService,
    private readonly trackingGateway: TrackingGateway,
    private readonly googleMapsService: GoogleMapsService,
    private readonly dataSource: DataSource,
  ) {}

  @Process('dispatch_emergency')
  async handleDispatch(job: Job<{ emergencyId: string; attempt: number }>) {
    const { emergencyId, attempt } = job.data
    const maxRadius = attempt === 1 ? 5000 : attempt === 2 ? 10000 : 20000  // m

    // 1. Obtener emergencia
    const emergency = await this.emergencyRepo.findOne({
      where: { id: emergencyId },
      relations: ['user'],
    })
    if (!emergency || emergency.status !== 'pending') return

    // 2. Buscar ambulancia más cercana con PostGIS
    // CRÍTICO: PostGIS usa (lng, lat) — NO (lat, lng)
    const result = await this.dataSource.query(`
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
      LIMIT 1
    `, [emergency.userLat, emergency.userLng, maxRadius])

    if (!result.length) {
      // No hay ambulancia disponible — reintentar con radio mayor (BullMQ retry)
      if (attempt < 3) {
        // Encolar nuevo intento
        await job.queue.add('dispatch_emergency', {
            emergencyId,
            attempt: attempt + 1
        }, { delay: 5000 });
        return;
      }
      // Notificar al usuario que no hay ambulancias disponibles
      await this.emergencyRepo.update(emergencyId, { status: 'cancelled' as any, cancelReason: 'Sin ambulancias disponibles' })
      this.trackingGateway.emitToEmergency(emergencyId, 'no_ambulance_available', {})
      return
    }

    const ambulance = result[0]

    // 3. Calcular ETA real con Google Maps
    let eta = Math.ceil(ambulance.distance_meters / 500)  // fallback: 500m/min
    try {
      eta = await this.googleMapsService.getETA(
        { lat: ambulance.locationLat, lng: ambulance.locationLng },
        { lat: emergency.userLat, lng: emergency.userLng },
      )
    } catch { /* usar fallback si Google Maps falla */ }

    // 4. Asignar ambulancia — transacción para evitar doble asignación
    await this.dataSource.transaction(async (manager) => {
      // Bloquear fila para evitar condición de carrera
      const locked = await manager.query(`
        SELECT id FROM ambulances WHERE id = $1 AND status = 'available'
        FOR UPDATE SKIP LOCKED
      `, [ambulance.id])

      if (!locked.length) {
        throw new Error('Ambulance taken by another emergency, retrying...')
      }

      await manager.update(Ambulance, ambulance.id, { status: 'on_route' as any })
      await manager.update(Emergency, emergencyId, {
        ambulanceId: ambulance.id,
        status: 'assigned' as any,
        estimatedArrivalMinutes: eta,
        assignedAt: new Date(),
      })
    })

    // 5. Notificar al conductor via Firebase Push
    if (ambulance.fcmToken) {
      await this.notificationsService.sendPush(ambulance.fcmToken, {
        title: '🚨 Nueva emergencia',
        body: `${emergency.type === 'critical' ? 'CRÍTICA' : 'Urgente'} — ${emergency.address}`,
        data: {
          type: 'NEW_EMERGENCY',
          emergencyId,
          userLat: String(emergency.userLat),
          userLng: String(emergency.userLng),
          userName: emergency.user.name,
          bloodType: emergency.user.bloodType || 'No indicado',
          allergies: emergency.user.allergies || 'Ninguna',
        },
      })
    }

    // 6. Notificar al usuario via WebSocket
    this.trackingGateway.emitToEmergency(emergencyId, 'emergency_assigned', {
      ambulanceId: ambulance.id,
      conductorName: ambulance.conductor_name,
      plate: ambulance.plate,
      type: ambulance.type,
      estimatedArrivalMinutes: eta,
      ambulanceLat: ambulance.locationLat,
      ambulanceLng: ambulance.locationLng,
    })
  }
}
