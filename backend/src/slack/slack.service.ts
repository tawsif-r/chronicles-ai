import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { WebClient } from '@slack/web-api';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class SlackService {
  constructor(
    @InjectRepository(AgentChannel)
    private readonly channelRepo: Repository<AgentChannel>,
    private readonly chatService: ChatService,
  ) {}

  verifySignature(
    signingSecret: string,
    timestamp: string,
    rawBody: Buffer,
    signature: string,
  ): boolean {
    const base = `v0:${timestamp}:${rawBody.toString()}`;
    const expected =
      'v0=' + createHmac('sha256', signingSecret).update(base).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async findChannelBySlackEvent(
    teamId: string,
    slackChannelId: string,
  ): Promise<AgentChannel | null> {
    return this.channelRepo
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.agent', 'agent')
      .leftJoinAndSelect('agent.workspace', 'workspace')
      .where('ch.channelType = :type', { type: 'slack' })
      .andWhere("ch.config->>'teamId' = :teamId", { teamId })
      .andWhere("ch.config->>'slackChannelId' = :slackChannelId", {
        slackChannelId,
      })
      .andWhere('ch.enabled = true')
      .getOne();
  }

  async handleIncomingMessage(
    agentChannel: AgentChannel,
    text: string,
    slackChannelId: string,
  ): Promise<void> {
    const reply = await this.chatService.sendMessage(
      agentChannel.agent.id,
      agentChannel.agent.workspace.id,
      text,
    );
    await this.sendMessage(
      agentChannel.config.botToken,
      slackChannelId,
      reply,
    );
  }

  async sendMessage(
    botToken: string,
    slackChannelId: string,
    text: string,
  ): Promise<void> {
    const client = new WebClient(botToken);
    await client.chat.postMessage({ channel: slackChannelId, text });
  }
}
