import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (ws) => ws.apiKeys, { onDelete: 'CASCADE' })
  workspace: Workspace;

  /** 'anthropic' | 'openai' | 'ollama' */
  @Column()
  provider: string;

  /** AES-256-GCM encrypted. Never returned to clients. */
  @Column()
  encryptedKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
