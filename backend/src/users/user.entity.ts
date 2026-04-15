import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @OneToOne(() => Workspace, { eager: false, cascade: true })
  @JoinColumn()
  workspace: Workspace;

  @CreateDateColumn()
  createdAt: Date;
}
