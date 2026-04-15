import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from './agent.entity';
import type { ChannelType } from '@chronicles/shared';

@Entity('agent_channels')
export class AgentChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (agent) => agent.channels, { onDelete: 'CASCADE' })
  agent: Agent;

  @Column()
  channelType: ChannelType;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, string>;

  @Column({ default: true })
  enabled: boolean;
}
