import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { ApiKey } from '../api-keys/api-key.entity';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  diskPath: string;

  @OneToMany(() => Agent, (agent) => agent.workspace)
  agents: Agent[];

  @OneToMany(() => ApiKey, (key) => key.workspace)
  apiKeys: ApiKey[];

  @CreateDateColumn()
  createdAt: Date;
}
