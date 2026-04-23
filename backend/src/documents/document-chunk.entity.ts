import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { VectorColumn } from '../shared/vector-column';

@Entity('document_chunks')
@Index(['document'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, (doc) => doc.chunks, { onDelete: 'CASCADE' })
  document: Document;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @VectorColumn(1536)
  embedding: number[] | null;

  @Column({ type: 'int' })
  charStart: number;

  @Column({ type: 'int' })
  charEnd: number;

  @CreateDateColumn()
  createdAt: Date;
}
