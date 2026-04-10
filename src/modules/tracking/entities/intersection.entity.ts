import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IntersectionType {
  TRAFFIC_LIGHT = 'traffic_light',
  ROUNDABOUT = 'roundabout',
  CRITICAL_CROSSING = 'critical_crossing',
}

@Entity('intersections')
export class Intersection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: IntersectionType,
    default: IntersectionType.TRAFFIC_LIGHT,
  })
  type: IntersectionType;

  // PostGIS — PUNTO GEOGRÁFICO
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: any; // Formato GeoJSON: { type: 'Point', coordinates: [lng, lat] }

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
