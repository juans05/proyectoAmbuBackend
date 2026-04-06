import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Emergency } from '../../emergencies/entities/emergency.entity';
import { Ambulance } from '../../ambulances/entities/ambulance.entity';

@Entity('route_logs')
export class RouteLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Emergency, { onDelete: 'CASCADE' })
  @Index()
  emergency: Emergency;

  @Column()
  emergencyId: string;

  @ManyToOne(() => Ambulance)
  @Index()
  ambulance: Ambulance;

  @Column()
  ambulanceId: string;

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  altitude: number;

  @Column({ type: 'float', nullable: true })
  heading: number;

  @Column({ type: 'float', nullable: true })
  speed: number;

  // PostGIS Point para queries espaciales
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: any;

  @CreateDateColumn()
  createdAt: Date;
}
