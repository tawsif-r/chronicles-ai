import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';
import { AgentChannel } from './agent-channel.entity';
import type { AgentStatus, ModelProvider } from '@chronicles/shared';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (ws) => ws.agents, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  name: string;

  @Column({ default: 'stopped' })
  status: AgentStatus;

  @Column()
  modelProvider: ModelProvider;

  @Column()
  modelName: string;

  /** Dynamically assigned at start time; null when stopped. */
  @Column({ nullable: true, type: 'int' })
  gatewayPort: number | null;

  /** Agent identity / system prompt. Written to SOUL.md at start. */
  @Column({ type: 'text', default: '' })
  soulMd: string;

  /** Tool configuration. Written to TOOLS.md at start. */
  @Column({ type: 'text', default: '' })
  toolsMd: string;

  /** Display name + avatar. Written to IDENTITY.md at start. */
  @Column({ type: 'text', default: '' })
  identityMd: string;

  /** Scheduled tasks. Written to HEARTBEAT.md at start. */
  @Column({ type: 'text', default: '' })
  heartbeatMd: string;

  // MEMORY.md is NOT stored here — it lives on disk and is owned by OpenClaw.

  @OneToMany(() => AgentChannel, (c) => c.agent, { cascade: true, eager: true })
  channels: AgentChannel[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
