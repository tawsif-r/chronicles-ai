import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { AgentsService } from '../agents/agents.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { LlmService, LlmTool, AgenticMessage } from '../llm/llm.service';
import { BillingService } from '../billing/billing.service';
import { LogsService } from '../logs/logs.service';
import { ToolExecutorService, ToolExecutionContext } from '../tools/tool-executor.service';
import type { Agent } from '../agents/agent.entity';

const MAX_AGENTIC_ITERATIONS = 5;

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
    private readonly billingService: BillingService,
    private readonly logsService: LogsService,
    private readonly toolExecutorService: ToolExecutorService,
  ) {}

  async sendMessage(
    agentId: string,
    workspaceId: string,
    message: string,
    sessionId?: string,
  ): Promise<string> {
    const agent = await this.agentsService.findOne(agentId, workspaceId);

    const log = async (level: 'info' | 'warn' | 'error' | 'debug', msg: string) => {
      try { await this.logsService.ingest(agentId, level, msg); } catch { /* never break chat */ }
    };

    try {
      await log('info', `Message received (${message.length} chars)`);

      const history = await this.msgRepo.find({
        where: { agent: { id: agentId }, ...(sessionId ? { sessionId } : {}) },
        order: { createdAt: 'ASC' },
        take: 100,
      });

      const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message },
      ];

      await this.billingService.checkMessageLimit(workspaceId);

      const apiKeys = await this.apiKeysService.buildEnvForAgent(workspaceId);
      this.logger.log(
        `workspace=${workspaceId} provider=${agent.modelProvider} model=${agent.modelName} keys=[${Object.keys(apiKeys).join(',')}]`,
      );

      await log('debug', `LLM call: provider=${agent.modelProvider} model=${agent.modelName}`);

      const tools = this.parseTools(agent);
      let reply: string;

      if (tools.length > 0 && agent.modelProvider === 'claude') {
        await log('debug', `Agentic mode: ${tools.length} tool(s) available`);
        const ctx: ToolExecutionContext = { agentId, workspaceId };
        reply = await this.runAgenticLoop(agent, messages, apiKeys, tools, ctx, log);
      } else {
        reply = await this.llmService.chat({
          provider: agent.modelProvider,
          model: agent.modelName,
          systemPrompt: agent.soulMd,
          messages,
          apiKeys,
        });
      }

      await log('info', `Reply generated (${reply.length} chars)`);

      await this.msgRepo.save([
        this.msgRepo.create({ agent, role: 'user', content: message, sessionId: sessionId ?? null }),
        this.msgRepo.create({ agent, role: 'assistant', content: reply, sessionId: sessionId ?? null }),
      ]);

      await this.billingService.incrementMessageCount(workspaceId);

      return reply;
    } catch (err: any) {
      await log('error', err?.message ?? 'Unknown error in sendMessage');
      throw err;
    }
  }

  async getHistory(
    agentId: string,
    workspaceId: string,
    page = 1,
    limit = 50,
  ): Promise<ChatMessage[]> {
    await this.agentsService.findOne(agentId, workspaceId);
    return this.msgRepo.find({
      where: { agent: { id: agentId } },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  private parseTools(agent: Agent): LlmTool[] {
    const raw = agent.toolsMd?.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as LlmTool[];
    } catch {
      this.logger.warn(`agent=${agent.id} toolsMd is not valid JSON — tools disabled`);
      return [];
    }
  }

  private async runAgenticLoop(
    agent: Agent,
    initialMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
    apiKeys: Record<string, string>,
    tools: LlmTool[],
    ctx: ToolExecutionContext,
    log: (level: 'info' | 'warn' | 'error' | 'debug', msg: string) => Promise<void>,
  ): Promise<string> {
    const apiKey = apiKeys['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('Anthropic API key not set — add it in Settings');

    let messages: AgenticMessage[] = initialMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    for (let i = 0; i < MAX_AGENTIC_ITERATIONS; i++) {
      const result = await this.llmService.agenticRound({
        model: agent.modelName,
        systemPrompt: agent.soulMd,
        messages,
        apiKey,
        tools,
      });

      if (result.toolCalls.length === 0) {
        return result.text;
      }

      const toolNames = result.toolCalls.map(t => t.name).join(', ');
      await log('debug', `Tool calls [iter ${i + 1}]: ${toolNames}`);

      // Append assistant message with raw content blocks (includes tool_use)
      messages.push({ role: 'assistant', content: result.rawContent });

      // Execute tools and collect results
      const toolResults = await Promise.all(
        result.toolCalls.map(tc =>
          this.toolExecutorService.execute(tc.name, tc.input, ctx),
        ),
      );

      for (let j = 0; j < result.toolCalls.length; j++) {
        await log('debug', `Tool ${result.toolCalls[j].name} → ${toolResults[j].slice(0, 100)}`);
      }

      // Append tool results as user message
      messages.push({
        role: 'user',
        content: result.toolCalls.map((tc, j) => ({
          type: 'tool_result' as const,
          tool_use_id: tc.id,
          content: toolResults[j],
        })),
      });
    }

    await log('warn', `Reached max agentic iterations (${MAX_AGENTIC_ITERATIONS})`);
    return 'I reached the maximum number of tool call steps. Please try a simpler request.';
  }
}
