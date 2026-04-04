import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 6 })
  ubigeo: string; // código INEI

  @Column({ length: 100 })
  department: string;

  @Column({ length: 100 })
  province: string;

  @Column({ length: 100 })
  district: string;
}
