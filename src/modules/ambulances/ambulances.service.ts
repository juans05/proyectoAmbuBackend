import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AmbulanceStatus } from '../../common/enums/ambulance-status.enum';
import { GeoQueryDto } from '../../common/dto/geo-query.dto';
import { kmToMeters } from '../../common/utils/geo.utils';

@Injectable()
export class AmbulancesService {
  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAmbulanceDto): Promise<Ambulance> {
    const existing = await this.ambulanceRepo.findOne({
      where: { plate: dto.plate },
    });
    if (existing)
      throw new ConflictException('Ya existe una ambulancia con esa placa');
    const ambulance = this.ambulanceRepo.create(dto);
    return this.ambulanceRepo.save(ambulance);
  }

  async findByCompany(companyId: string): Promise<Ambulance[]> {
    return this.ambulanceRepo.find({
      where: { companyId, isActive: true },
      relations: ['conductor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Ambulance> {
    const ambulance = await this.ambulanceRepo.findOne({
      where: { id },
      relations: ['company', 'conductor'],
    });
    if (!ambulance) throw new NotFoundException('Ambulancia no encontrada');
    return ambulance;
  }

  async updateStatus(id: string, status: AmbulanceStatus): Promise<Ambulance> {
    await this.ambulanceRepo.update(id, { status });
    return this.findOne(id);
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<void> {
    // CRÍTICO: PostGIS usa ST_MakePoint(lng, lat) — NO (lat, lng)
    await this.dataSource.query(
      `
      UPDATE ambulances
      SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
          "locationLat" = $2,
          "locationLng" = $1,
          "locationUpdatedAt" = NOW()
      WHERE id = $3
    `,
      [dto.lng, dto.lat, id],
    );
  }

  async findByConductor(conductorId: string): Promise<Ambulance | null> {
    return this.ambulanceRepo.findOne({
      where: { conductorId, isActive: true },
      relations: ['company'],
    });
  }

  async updateStatusByConductor(
    conductorId: string,
    status: AmbulanceStatus,
  ): Promise<void> {
    await this.ambulanceRepo.update({ conductorId }, { status });
  }

  async getConductorDayStats(
    conductorId: string,
  ): Promise<{ services: number; totalAmount: number }> {
    const result = await this.dataSource.query(
      `
      SELECT
        COUNT(*) AS services,
        COALESCE(SUM(e."totalAmount"), 0) AS total_amount
      FROM emergencies e
      JOIN ambulances a ON e."ambulanceId" = a.id
      WHERE a."conductorId" = $1
        AND e.status = 'completed'
        AND DATE(e."completedAt") = CURRENT_DATE
      `,
      [conductorId],
    );
    return {
      services: +result[0]?.services || 0,
      totalAmount: +result[0]?.total_amount || 0,
    };
  }

  async findNearby(query: GeoQueryDto): Promise<Ambulance[]> {
    const radiusMeters = kmToMeters(query.radius ?? 5);
    return this.dataSource.query(
      `
      SELECT
        a.*,
        ST_Distance(
          a.location::geography,
          ST_MakePoint($1, $2)::geography
        ) AS distance_meters
      FROM ambulances a
      WHERE a.status = 'available'
        AND a."isActive" = true
        AND a.location IS NOT NULL
        AND ST_DWithin(
          a.location::geography,
          ST_MakePoint($1, $2)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      LIMIT 20
    `,
      [query.lng, query.lat, radiusMeters],
    );
  }
}
