import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User

  @Column({ nullable: true })
  userId: string

  @Column({ nullable: true })
  emergencyId: string

  @Column({ nullable: true })
  subscriptionId: string

  @Column({ length: 20 })
  type: string  // 'emergency' | 'subscription'

  @Column({ type: 'float' })
  amount: number

  @Column({ type: 'float', nullable: true })
  platformFee: number  // 12%

  @Column({ type: 'float', nullable: true })
  companyAmount: number  // 88%

  @Column({ length: 20, default: 'pending' })
  status: string  // 'pending' | 'paid' | 'failed' | 'refunded'

  @Column({ nullable: true })
  culqiChargeId: string

  @Column({ length: 20, nullable: true })
  paymentMethod: string  // 'card' | 'cash'

  @CreateDateColumn()
  createdAt: Date
}
