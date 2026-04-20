import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { Agent } from '../agents/agent.entity';
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
    const { scheduleId, agentId, workspaceId, prompt } = job.data;
    this.logger.log(`Running schedule ${scheduleId} for agent ${agentId}`);

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
          } else if (ch.channelType === 'telegram' && ch.config.botToken && ch.config.chatId) {
            await this.telegramService.sendOutbound(ch.config.botToken, ch.config.chatId, reply);
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
}
