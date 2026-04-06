import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EmergencyStatus } from '../../../common/enums/emergency-status.enum';
import { User } from '../../users/entities/user.entity';
import { Ambulance } from '../../ambulances/entities/ambulance.entity';
import { FamilyMember } from '../../users/entities/family-member.entity';

@Entity('emergencies')
export class Emergency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Ambulance, { nullable: true })
  ambulance: Ambulance;

  @Column({ nullable: true })
  ambulanceId: string;

  @ManyToOne(() => FamilyMember, { nullable: true })
  familyMember: FamilyMember;

  @Column({ nullable: true })
  familyMemberId: string;

  @Column({
    type: 'enum',
    enum: EmergencyStatus,
    default: EmergencyStatus.PENDING,
  })
  status: EmergencyStatus;

  @Column({ length: 20, default: 'critical' })
  type: string; // critical | urgent | transfer

  // Ubicación del usuario — PostGIS
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  userLocation: any; // Formato GeoJSON: { type: 'Point', coordinates: [lng, lat] }

  @Column({ type: 'float' })
  userLat: number;

  @Column({ type: 'float' })
  userLng: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  userAltitude: number;

  @Column({ type: 'text' })
  address: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ type: 'float', nullable: true })
  totalAmount: number;

  @Column({ default: false })
  discountApplied: boolean; // si el usuario tenía suscripción activa

  @Column({ type: 'float', nullable: true })
  platformFee: number; // 12% del total

  @Column({ type: 'float', nullable: true })
  companyAmount: number; // 88% del total

  @Column({ nullable: true })
  estimatedArrivalMinutes: number;

  @Column({ type: 'text', nullable: true })
  suggestedRoutePolyline: string; // Polilínea codificada de la ruta teórica

  @Column({ type: 'int', nullable: true })
  actualDurationSeconds: number; // Tiempo real que tomó llegar

  @Column({ type: 'int', nullable: true })
  timeDifferenceSeconds: number; // Diferencia (IA): Real - Estimado

  @Column({ nullable: true })
  assignedAt: Date;

  @Column({ nullable: true })
  arrivedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true, type: 'text' })
  cancelReason: string;

  @Column({ nullable: true, type: 'int' })
  userRating: number; // 1-5

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
