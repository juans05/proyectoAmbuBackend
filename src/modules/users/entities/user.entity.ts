import { Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { UserRole } from '../../../common/enums/user-role.enum'
import { FamilyMember } from './family-member.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100 })
  name: string

  @Column({ unique: true, length: 150 })
  email: string

  @Column({ nullable: true, length: 20 })
  phone: string

  @Column({ nullable: true, select: false })  // select:false = no se devuelve por defecto
  password: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole

  @Column({ default: 'free' })
  subscriptionTier: string      // 'free' | 'protegido' | 'pro'

  @OneToMany(() => FamilyMember, (familyMember) => familyMember.user)
  familyMembers: FamilyMember[]

  @Column({ default: false })
  emailVerified: boolean

  @Column({ nullable: true })
  avatarUrl: string

  @Column({ nullable: true, length: 5 })
  bloodType: string     // A+, A-, B+, B-, AB+, AB-, O+, O-

  @Column({ nullable: true, type: 'text' })
  allergies: string

  @Column({ nullable: true, type: 'text' })
  chronicConditions: string

  @Column({ nullable: true })
  fcmToken: string      // Firebase Cloud Messaging token para notificaciones push

  @Column({ nullable: true })
  refreshToken: string  // hash del refresh token activo

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
