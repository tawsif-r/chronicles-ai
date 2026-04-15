import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ChatMessage } from './chat-message.entity';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    private readonly agentsService: AgentsService,
  ) {}

  async sendMessage(
    agentId: string,
    workspaceId: string,
    message: string,
  ): Promise<string> {
    const agent = await this.agentsService.findOne(agentId, workspaceId);

    if (agent.status !== 'running' || !agent.gatewayPort) {
      throw new BadRequestException('Agent is not running');
    }

    // TODO: Confirm exact OpenClaw HTTP gateway endpoint + body shape (Open Question #2)
    const { data } = await axios.post<{ reply: string }>(
      `http://127.0.0.1:${agent.gatewayPort}/message`,
      { content: message },
    );

    await this.msgRepo.save([
      this.msgRepo.create({ agent, role: 'user', content: message }),
      this.msgRepo.create({ agent, role: 'assistant', content: data.reply }),
    ]);

    return data.reply;
  }

  async getHistory(
    agentId: string,
    workspaceId: string,
    page = 1,
    limit = 50,
  ): Promise<ChatMessage[]> {
    await this.agentsService.findOne(agentId, workspaceId); // ownership check
    return this.msgRepo.find({
      where: { agent: { id: agentId } },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
