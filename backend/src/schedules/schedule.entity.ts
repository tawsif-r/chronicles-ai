import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { Agent } from '../agents/agent.entity';

@Entity('agent_schedules')
export class AgentSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE', eager: false })
  agent: Agent;

  @Column()
  agentId: string;

  @Column()
  workspaceId: string;

  @Column()
  cronExpression: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
