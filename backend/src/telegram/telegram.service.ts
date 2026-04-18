import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import TelegramBot from 'node-telegram-bot-api';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class TelegramService {
  private bots: Map<string, TelegramBot> = new Map();

  constructor(
    @InjectRepository(AgentChannel)
    private readonly channelRepo: Repository<AgentChannel>,
    private readonly chatService: ChatService,
  ) {}

  getBot(token: string): TelegramBot {
    if (!this.bots.has(token)) {
      this.bots.set(token, new TelegramBot(token, { polling: false }));
    }
    return this.bots.get(token)!;
  }

  async findChannelByTelegram(chatId: string): Promise<AgentChannel | null> {
    return this.channelRepo
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.agent', 'agent')
      .leftJoinAndSelect('agent.workspace', 'workspace')
      .where('ch.channelType = :type', { type: 'telegram' })
      .andWhere("ch.config->>'chatId' = :chatId", { chatId })
      .andWhere('ch.enabled = true')
      .getOne();
  }

  async handleIncomingMessage(
    agentChannel: AgentChannel,
    chatId: string,
    text: string,
  ): Promise<void> {
    const reply = await this.chatService.sendMessage(
      agentChannel.agent.id,
      agentChannel.agent.workspace.id,
      text,
    );
    const bot = this.getBot(agentChannel.config.botToken);
    await bot.sendMessage(chatId, reply);
  }
}
