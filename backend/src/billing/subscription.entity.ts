import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';
import { Plan } from './plan.entity';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn()
  workspace: Workspace;

  @ManyToOne(() => Plan, { eager: true, nullable: false })
  @JoinColumn()
  plan: Plan;

  @Column({ default: 'active' })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
