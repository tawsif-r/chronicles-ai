import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Agent } from './agent.entity';
import { Workspace } from '../workspaces/workspace.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly repo: Repository<Agent>,
  ) {}

  findAll(workspaceId: string): Promise<Agent[]> {
    return this.repo.find({
      where: { workspace: { id: workspaceId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<Agent> {
    const agent = await this.repo.findOne({
      where: { id, workspace: { id: workspaceId } },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async create(
    dto: CreateAgentDto,
    workspace: Workspace,
  ): Promise<Agent> {
    const agent = this.repo.create({ ...dto, workspace, channels: [] });
    return this.repo.save(agent);
  }

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.findOne(id, workspaceId);
    Object.assign(agent, dto);
    return this.repo.save(agent);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const agent = await this.findOne(id, workspaceId);
    await this.repo.remove(agent);
  }

  /** Write DB config fields to the agent's disk workspace. Called before spawn. */
  async writeConfigFiles(agent: Agent, workspace: Workspace): Promise<void> {
    const dir = path.join(workspace.diskPath, 'agents', agent.id);
    await fs.mkdir(dir, { recursive: true });

    await Promise.all([
      fs.writeFile(path.join(dir, 'SOUL.md'), agent.soulMd),
      fs.writeFile(path.join(dir, 'TOOLS.md'), agent.toolsMd),
      fs.writeFile(path.join(dir, 'IDENTITY.md'), agent.identityMd),
      fs.writeFile(path.join(dir, 'HEARTBEAT.md'), agent.heartbeatMd),
    ]);
  }

  /** Read MEMORY.md directly from disk (never cached in DB). */
  async getMemory(agent: Agent, workspace: Workspace): Promise<string> {
    const file = path.join(workspace.diskPath, 'agents', agent.id, 'MEMORY.md');
    try {
      return await fs.readFile(file, 'utf8');
    } catch {
      return '';
    }
  }

  /** Write MEMORY.md directly to disk. */
  async setMemory(
    agent: Agent,
    workspace: Workspace,
    content: string,
  ): Promise<void> {
    const dir = path.join(workspace.diskPath, 'agents', agent.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'MEMORY.md'), content);
  }

  async updateStatus(
    id: string,
    status: Agent['status'],
    gatewayPort: number | null = null,
  ): Promise<void> {
    await this.repo.update(id, { status, gatewayPort });
  }

  /** Guard: throw if agent does not belong to workspace (IDOR prevention). */
  async assertOwnership(id: string, workspaceId: string): Promise<Agent> {
    const agent = await this.repo.findOne({
      where: { id },
      relations: ['workspace'],
    });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.workspace.id !== workspaceId) throw new ForbiddenException();
    return agent;
  }
}
