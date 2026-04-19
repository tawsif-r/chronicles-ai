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
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly repo: Repository<Agent>,
    @InjectRepository(AgentChannel)
    private readonly channelRepo: Repository<AgentChannel>,
    private readonly config: ConfigService,
    private readonly discordService: DiscordService,
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
    } else if (dto.channelType === 'slack') {
      await this.registerSlackWebhook(dto.config.botToken);
    } else if (dto.channelType === 'discord') {
      await this.registerDiscordBot(dto.config.botToken);
    } else if (dto.channelType === 'whatsapp') {
      await this.registerWhatsappWebhook(dto.config as Record<string, string>);
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

  private async registerSlackWebhook(botToken: string): Promise<void> {
    let json: { ok: boolean; error?: string };
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${botToken}` },
      });
      json = await res.json() as { ok: boolean; error?: string };
    } catch {
      throw new BadRequestException('Could not reach Slack API. Check your internet connection.');
    }

    if (!json.ok) {
      throw new BadRequestException(`Slack token validation failed: ${json.error ?? 'Unknown error'}`);
    }
  }

  private async registerDiscordBot(botToken: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${botToken}` },
      });
    } catch {
      throw new BadRequestException('Could not reach Discord API. Check your internet connection.');
    }

    if (!res.ok) {
      throw new BadRequestException('Invalid Discord bot token');
    }

    await this.discordService.init(botToken);
  }

  private async registerWhatsappWebhook(config: Record<string, string>): Promise<void> {
    const baseUrl = this.config.get<string>('WEBHOOK_BASE_URL');
    if (!baseUrl) {
      throw new BadRequestException(
        'WEBHOOK_BASE_URL is not set in server config. Add it to your .env file.',
      );
    }

    const { accountSid, authToken, phoneNumber } = config;
    if (!accountSid || !authToken || !phoneNumber) {
      throw new BadRequestException('Missing Twilio credentials: accountSid, authToken, phoneNumber');
    }

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`;

    let listRes: Response;
    try {
      listRes = await fetch(listUrl, {
        headers: { Authorization: `Basic ${basicAuth}` },
      });
    } catch {
      throw new BadRequestException('Could not reach Twilio API. Check your internet connection.');
    }

    if (!listRes.ok) {
      throw new BadRequestException('Twilio authentication failed. Check accountSid and authToken.');
    }

    const listJson = await listRes.json() as { incoming_phone_numbers?: Array<{ sid: string }> };
    const phoneNumbers = listJson.incoming_phone_numbers ?? [];
    if (phoneNumbers.length === 0) {
      throw new BadRequestException(`Phone number ${phoneNumber} not found in Twilio account`);
    }

    const phoneNumberSid = phoneNumbers[0].sid;
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/whatsapp`;
    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;

    let updateRes: Response;
    try {
      updateRes = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `SmsUrl=${encodeURIComponent(webhookUrl)}`,
      });
    } catch {
      throw new BadRequestException('Could not reach Twilio API. Check your internet connection.');
    }

    if (!updateRes.ok) {
      throw new BadRequestException('Failed to register webhook URL with Twilio');
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
