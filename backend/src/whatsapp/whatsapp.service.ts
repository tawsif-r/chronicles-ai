import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Twilio } from 'twilio';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class WhatsappService {
  constructor(
    @InjectRepository(AgentChannel)
    private readonly channelRepo: Repository<AgentChannel>,
    private readonly chatService: ChatService,
  ) {}

  async findChannelByPhoneNumber(fromNumber: string): Promise<AgentChannel | null> {
    return this.channelRepo
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.agent', 'agent')
      .leftJoinAndSelect('agent.workspace', 'workspace')
      .where('ch.channelType = :type', { type: 'whatsapp' })
      .andWhere("ch.config->>'accountSid' IS NOT NULL")
      .andWhere('ch.enabled = true')
      .getOne();
  }

  async handleIncomingMessage(
    agentChannel: AgentChannel,
    fromNumber: string,
    text: string,
  ): Promise<void> {
    const reply = await this.chatService.sendMessage(
      agentChannel.agent.id,
      agentChannel.agent.workspace.id,
      text,
    );

    const client = new Twilio(
      agentChannel.config.accountSid,
      agentChannel.config.authToken,
    );

    await client.messages.create({
      from: `whatsapp:${agentChannel.config.phoneNumber}`,
      to: `whatsapp:${fromNumber}`,
      body: reply,
    });
  }
}
