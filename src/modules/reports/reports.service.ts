import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { EmergencyStatus } from '../../common/enums/emergency-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
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
      this.dataSource.query(
        `SELECT COUNT(*) FROM ambulances WHERE status = 'available' AND "isActive" = true`,
      ),
      this.dataSource.query(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM payments
          WHERE status = 'paid' AND DATE("createdAt") = CURRENT_DATE
        `),
      this.dataSource.query(`
          SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("assignedAt" - "createdAt"))/60), 0) as avg_minutes
          FROM emergencies
          WHERE "assignedAt" IS NOT NULL AND DATE("createdAt") = CURRENT_DATE
        `),
    ]);

    return {
      activeEmergencies,
      availableAmbulances: +availableAmbulances[0]?.count || 0,
      todayRevenue: +todayRevenue[0]?.total || 0,
      avgResponseMinutes: +avgResponseTime[0]?.avg_minutes?.toFixed(1) || 0,
    };
  }

  async responseTimes() {
    return this.dataSource.query(`
      SELECT
        DATE_TRUNC('day', "createdAt") as day,
        AVG(EXTRACT(EPOCH FROM ("assignedAt" - "createdAt"))/60) as avg_minutes,
        COUNT(*) as total
      FROM emergencies
      WHERE "assignedAt" IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 DESC
    `);
  }

  async revenue(from?: string, to?: string) {
    const fromDate =
      from ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const toDate = to ?? new Date().toISOString();
    return this.dataSource.query(
      `
      SELECT
        DATE_TRUNC('day', "createdAt") as day,
        SUM(amount) as revenue,
        SUM("platformFee") as commissions,
        COUNT(*) as transactions
      FROM payments
      WHERE status = 'paid'
        AND "createdAt" BETWEEN $1 AND $2
      GROUP BY 1
      ORDER BY 1 DESC
    `,
      [fromDate, toDate],
    );
  }

  async heatmap() {
    return this.dataSource.query(`
      SELECT
        "userLat" as lat,
        "userLng" as lng,
        COUNT(*) as count
      FROM emergencies
      WHERE "createdAt" >= NOW() - INTERVAL '90 days'
      GROUP BY 1, 2
    `);
  }
}
