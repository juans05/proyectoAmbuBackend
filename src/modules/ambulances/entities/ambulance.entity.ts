import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AmbulanceStatus } from '../../../common/enums/ambulance-status.enum';
import { AmbulanceType } from '../../../common/enums/ambulance-type.enum';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ambulances')
export class Ambulance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, (company) => company.ambulances, {
    onDelete: 'CASCADE',
  })
  company: Company;

  @Column()
  companyId: string;

  @ManyToOne(() => User, { nullable: true })
  conductor: User;

  @Column({ nullable: true })
  conductorId: string;

  @Column({ unique: true, length: 10 })
  plate: string; // placa roja MINSA

  @Column({ type: 'enum', enum: AmbulanceType })
  type: AmbulanceType; // I, II, III

  @Column({
    type: 'enum',
    enum: AmbulanceStatus,
    default: AmbulanceStatus.OFFLINE,
  })
  status: AmbulanceStatus;

  // PostGIS — PUNTO GEOGRÁFICO — CRÍTICO para despacho automático
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: any; // Formato GeoJSON: { type: 'Point', coordinates: [lng, lat] }

  @Column({ type: 'float', nullable: true })
  locationLat: number;

  @Column({ type: 'float', nullable: true })
  locationLng: number;

  @Column({ nullable: true })
  locationUpdatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
