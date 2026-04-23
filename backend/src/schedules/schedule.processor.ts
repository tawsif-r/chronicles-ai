import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { Agent } from '../agents/agent.entity';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';
import { LogsService } from '../logs/logs.service';
import { SlackService } from '../slack/slack.service';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import { SchedulesService, SCHEDULES_QUEUE, SCHEDULE_JOB, ScheduleJobPayload } from './schedules.service';

@Processor(SCHEDULES_QUEUE)
export class ScheduleProcessor {
  private readonly logger = new Logger(ScheduleProcessor.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly chatService: ChatService,
    private readonly logsService: LogsService,
    private readonly slackService: SlackService,
    private readonly telegramService: TelegramService,
    private readonly discordService: DiscordService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Process(SCHEDULE_JOB)
  async handle(job: Job<ScheduleJobPayload>): Promise<void> {
    const { scheduleId, agentId, workspaceId, prompt, telegramDispatch = 'owner' } = job.data;
    this.logger.log(`Running schedule ${scheduleId} for agent ${agentId} (telegramDispatch=${telegramDispatch})`);

    let reply: string;
    try {
      reply = await this.chatService.sendMessage(agentId, workspaceId, prompt);
    } catch (err: any) {
      await this.logsService.ingest(agentId, 'error', `[Schedule] Failed: ${err?.message ?? 'unknown error'}`).catch(() => {});
      throw err;
    }

    await this.logsService
      .ingest(agentId, 'info', `[Schedule] ${prompt.slice(0, 60)} → ${reply.slice(0, 100)}`)
      .catch(() => {});

    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['channels'],
    });

    if (agent?.channels) {
      for (const ch of agent.channels.filter((c) => c.enabled)) {
        try {
          if (ch.channelType === 'slack' && ch.config.botToken && ch.config.channelId) {
            await this.slackService.sendMessage(ch.config.botToken, ch.config.channelId, reply);

          } else if (ch.channelType === 'telegram' && ch.config.botToken) {
            await this.dispatchTelegram(ch, agentId, workspaceId, prompt, reply, telegramDispatch);

          } else if (ch.channelType === 'discord' && ch.config.botToken && ch.config.userId) {
            await this.discordService.sendOutbound(ch.config.botToken, ch.config.userId, reply);
          }
        } catch (err: any) {
          this.logger.warn(`Channel dispatch failed for ${ch.channelType}: ${err.message}`);
        }
      }
    }

    await this.schedulesService.markRan(scheduleId);
  }

  private async dispatchTelegram(
    ch: { config: Record<string, string> },
    agentId: string,
    workspaceId: string,
    prompt: string,
    globalReply: string,
    mode: string,
  ): Promise<void> {
    const { botToken, chatId, knownChatIds: rawKnown } = ch.config;
    const knownChatIds: string[] = rawKnown ? JSON.parse(rawKnown) : (chatId ? [chatId] : []);

    if (mode === 'none' || !botToken) return;

    if (mode === 'owner') {
      if (chatId) await this.telegramService.sendOutbound(botToken, chatId, globalReply);

    } else if (mode === 'broadcast') {
      for (const id of knownChatIds) {
        await this.telegramService.sendOutbound(botToken, id, globalReply);
      }

    } else if (mode === 'personalized') {
      for (const id of knownChatIds) {
        const personalReply = await this.chatService.sendMessage(agentId, workspaceId, prompt, id);
        await this.telegramService.sendOutbound(botToken, id, personalReply);
      }
    }
  }
}
