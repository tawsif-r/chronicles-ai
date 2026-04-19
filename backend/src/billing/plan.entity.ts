import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanName = 'FREE' | 'PRO' | 'MAX';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: PlanName;

  @Column({ default: 1 })
  maxAgents: number;

  @Column({ default: 1 })
  maxChannelsPerAgent: number;

  @Column({ default: 1000 })
  maxMessagesPerMonth: number;

  @Column({ default: 7 })
  logRetentionDays: number;

  @Column('simple-array', { default: 'anthropic' })
  allowedProviders: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceMonthly: number;

  @CreateDateColumn()
  createdAt: Date;
}
