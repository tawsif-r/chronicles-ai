import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  /** Snippet injected into SOUL.md when this skill is enabled for an agent. */
  @Column({ type: 'text' })
  soulMdSnippet: string;

  @Column({ default: true })
  isBuiltin: boolean;
}
