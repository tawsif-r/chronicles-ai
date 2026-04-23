import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';
import { DocumentChunk } from './document-chunk.entity';

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

@Entity('documents')
@Index(['workspace', 'createdAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  filename: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ default: 'pending' })
  status: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column()
  diskPath: string;

  @Column({ default: 0 })
  chunkCount: number;

  @OneToMany(() => DocumentChunk, (c) => c.document, { cascade: true })
  chunks: DocumentChunk[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
