import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { AgentsService } from '../agents/agents.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
    private readonly apiKeysService: ApiKeysService,
    private readonly llmService: LlmService,
  ) {}

  async sendMessage(
    agentId: string,
    workspaceId: string,
    message: string,
  ): Promise<string> {
    const agent = await this.agentsService.findOne(agentId, workspaceId);

    // Load recent history from DB (last 50 turns = 100 messages)
    const history = await this.msgRepo.find({
      where: { agent: { id: agentId } },
      order: { createdAt: 'ASC' },
      take: 100,
    });

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ];

    // Get decrypted API keys for this workspace
    const apiKeys = await this.apiKeysService.buildEnvForAgent(workspaceId);
    this.logger.log(
      `workspace=${workspaceId} provider=${agent.modelProvider} model=${agent.modelName} keys=[${Object.keys(apiKeys).join(',')}]`,
    );

    // Call LLM
    const reply = await this.llmService.chat({
      provider: agent.modelProvider,
      model: agent.modelName,
      systemPrompt: agent.soulMd,
      messages,
      apiKeys,
    });

    // Persist both turns
    await this.msgRepo.save([
      this.msgRepo.create({ agent, role: 'user', content: message }),
      this.msgRepo.create({ agent, role: 'assistant', content: reply }),
    ]);

    return reply;
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
