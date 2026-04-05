import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { EmergencyStatus } from '../../common/enums/emergency-status.enum';
import { AmbulanceStatus } from '../../common/enums/ambulance-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    private readonly dataSource: DataSource,
  ) {}

  async dashboard() {
    const [
      activeEmergencies,
      availableAmbulances,
      todayRevenue,
      avgResponseTime,
    ] = await Promise.all([
      this.emergencyRepo.count({ where: { status: EmergencyStatus.ASSIGNED } }),
      this.ambulanceRepo.count({
        where: { status: AmbulanceStatus.AVAILABLE, isActive: true },
      }),
      this.dataSource.query<Array<{ total: string }>>(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM ambudb.payments
          WHERE status = 'paid' AND DATE("createdAt") = CURRENT_DATE
        `),
      this.dataSource.query<Array<{ avg_minutes: string }>>(`
          SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("assignedAt" - e."createdAt"))/60), 0) as avg_minutes
          FROM ambudb.emergencies e
          WHERE "assignedAt" IS NOT NULL AND DATE(e."createdAt") = CURRENT_DATE
        `),
    ]);

    return {
      activeEmergencies,
      availableAmbulances,
      todayRevenue: +(todayRevenue[0]?.total ?? 0),
      avgResponseTimeMinutes: +parseFloat(
        avgResponseTime[0]?.avg_minutes ?? '0',
      ).toFixed(1),
    };
  }

  async responseTimes(): Promise<unknown[]> {
    return this.dataSource.query<unknown[]>(`
      SELECT
        DATE_TRUNC('day', e."createdAt") as day,
        AVG(EXTRACT(EPOCH FROM ("assignedAt" - e."createdAt"))/60) as avg_minutes,
        COUNT(*) as total
      FROM ambudb.emergencies e
      WHERE "assignedAt" IS NOT NULL
        AND e."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 DESC
    `);
  }

  async revenue(from?: string, to?: string): Promise<unknown[]> {
    const fromDate =
      from ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const toDate = to ?? new Date().toISOString();
    return this.dataSource.query<unknown[]>(
      `
      SELECT
        DATE_TRUNC('day', p."createdAt") as day,
        SUM(amount) as revenue,
        SUM("platformFee") as commissions,
        COUNT(*) as transactions
      FROM ambudb.payments p
      WHERE status = 'paid'
        AND p."createdAt" BETWEEN $1 AND $2
      GROUP BY 1
      ORDER BY 1 DESC
    `,
      [fromDate, toDate],
    );
  }

  async heatmap(): Promise<unknown[]> {
    return this.dataSource.query<unknown[]>(`
      SELECT
        "userLat" as lat,
        "userLng" as lng,
        COUNT(*) as count
      FROM ambudb.emergencies
      WHERE "createdAt" >= NOW() - INTERVAL '90 days'
      GROUP BY 1, 2
    `);
  }
}
