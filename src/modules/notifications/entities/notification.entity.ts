import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User

  @Column()
  userId: string

  @Column({ length: 150 })
  title: string

  @Column({ type: 'text' })
  body: string

  @Column({ length: 50 })
  type: string  // NEW_EMERGENCY | EMERGENCY_ASSIGNED | EMERGENCY_COMPLETED | SYSTEM

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>

  @Column({ default: false })
  isRead: boolean

  @CreateDateColumn()
  createdAt: Date
}
