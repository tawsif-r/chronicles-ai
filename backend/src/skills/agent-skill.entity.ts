import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { Skill } from './skill.entity';

@Entity('agent_skills')
export class AgentSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  agent: Agent;

  @ManyToOne(() => Skill)
  skill: Skill;

  @Column({ default: true })
  enabled: boolean;
}
