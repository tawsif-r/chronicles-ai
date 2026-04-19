import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, REST, Routes, GatewayIntentBits, ChannelType } from 'discord.js';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class DiscordService {
  private bots = new Map<string, Client>();

  constructor(
    @InjectRepository(AgentChannel)
    private readonly channelRepo: Repository<AgentChannel>,
    private readonly chatService: ChatService,
  ) {}

  async init(botToken: string): Promise<void> {
    if (this.bots.has(botToken)) return;

    const client = new Client({ intents: [GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

    client.on('messageCreate', async (msg) => {
      if (msg.author.bot) return;
      if (!msg.channel.isDMBased()) return;

      const agentChannel = await this.findChannelByDiscordDM(msg.author.id);
      if (!agentChannel) return;

      await this.handleIncomingMessage(agentChannel, msg.author.id, msg.content);
    });

    await client.login(botToken);
    this.bots.set(botToken, client);
  }

  async findChannelByDiscordDM(userId: string): Promise<AgentChannel | null> {
    return this.channelRepo
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.agent', 'agent')
      .leftJoinAndSelect('agent.workspace', 'workspace')
      .where('ch.channelType = :type', { type: 'discord' })
      .andWhere("ch.config->>'userId' = :userId", { userId })
      .andWhere('ch.enabled = true')
      .getOne();
  }

  async handleIncomingMessage(
    agentChannel: AgentChannel,
    userId: string,
    text: string,
  ): Promise<void> {
    const reply = await this.chatService.sendMessage(
      agentChannel.agent.id,
      agentChannel.agent.workspace.id,
      text,
    );

    for (const client of this.bots.values()) {
      if (client.isReady()) {
        const user = await client.users.fetch(userId);
        if (user) {
          await user.send(reply);
        }
      }
    }
  }
}
