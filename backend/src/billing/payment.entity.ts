import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  subscription: Subscription;

  @Column({ default: 0 })
  amount: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({ default: 'pending' })
  status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
