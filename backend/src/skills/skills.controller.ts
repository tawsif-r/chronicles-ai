import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { SkillsService } from './skills.service';

class EnableSkillDto {
  @IsUUID()
  skillId: string;
}

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  findAll() {
    return this.skillsService.findAll();
  }
}

// Agent-scoped routes live in AgentsController to keep routing clean.
// Alternatively, expose them here as /agents/:agentId/skills.
