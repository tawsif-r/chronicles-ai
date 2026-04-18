import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Agent } from './agent.entity';
import { AgentChannel } from './agent-channel.entity';
import { Workspace } from '../workspaces/workspace.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly repo: Repository<Agent>,
    @InjectRepository(AgentChannel)
    private readonly channelRepo: Repository<AgentChannel>,
    private readonly config: ConfigService,
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

  async addChannel(
    agentId: string,
    workspaceId: string,
    dto: CreateChannelDto,
  ): Promise<AgentChannel> {
    const agent = await this.findOne(agentId, workspaceId);

    if (dto.channelType === 'telegram') {
      await this.registerTelegramWebhook(dto.config.botToken);
    }

    const channel = this.channelRepo.create({
      agent,
      channelType: dto.channelType,
      config: dto.config,
      enabled: dto.enabled ?? true,
    });
    return this.channelRepo.save(channel);
  }

  private async registerTelegramWebhook(botToken: string): Promise<void> {
    const baseUrl = this.config.get<string>('WEBHOOK_BASE_URL');
    if (!baseUrl) {
      throw new BadRequestException(
        'WEBHOOK_BASE_URL is not set in server config. Add it to your .env file.',
      );
    }
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/telegram/${botToken}`;
    const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

    let json: { ok: boolean; description?: string };
    try {
      const res = await fetch(telegramUrl);
      json = await res.json() as { ok: boolean; description?: string };
    } catch {
      throw new BadRequestException('Could not reach Telegram API. Check your internet connection.');
    }

    if (!json.ok) {
      throw new BadRequestException(
        `Telegram webhook registration failed: ${json.description ?? 'Unknown error'}`,
      );
    }
  }

  async updateChannel(
    agentId: string,
    workspaceId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<AgentChannel> {
    await this.findOne(agentId, workspaceId);
    const channel = await this.channelRepo.findOneBy({ id: channelId, agent: { id: agentId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (dto.config !== undefined) channel.config = dto.config;
    if (dto.enabled !== undefined) channel.enabled = dto.enabled;
    return this.channelRepo.save(channel);
  }

  async removeChannel(
    agentId: string,
    workspaceId: string,
    channelId: string,
  ): Promise<void> {
    await this.findOne(agentId, workspaceId);
    await this.channelRepo.delete({ id: channelId, agent: { id: agentId } });
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
