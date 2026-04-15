import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './skill.entity';
import { AgentSkill } from './agent-skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(AgentSkill)
    private readonly agentSkillRepo: Repository<AgentSkill>,
  ) {}

  findAll(): Promise<Skill[]> {
    return this.skillRepo.find();
  }

  getAgentSkills(agentId: string): Promise<AgentSkill[]> {
    return this.agentSkillRepo.find({
      where: { agent: { id: agentId } },
      relations: ['skill'],
    });
  }

  enableSkill(agentId: string, skillId: string): Promise<AgentSkill> {
    return this.agentSkillRepo.save(
      this.agentSkillRepo.create({
        agent: { id: agentId },
        skill: { id: skillId },
        enabled: true,
      }),
    );
  }

  async disableSkill(agentSkillId: string): Promise<void> {
    await this.agentSkillRepo.delete(agentSkillId);
  }
}
