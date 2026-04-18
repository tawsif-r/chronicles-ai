import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat-message.entity';
import { AgentsService } from '../agents/agents.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { LlmService } from '../llm/llm.service';
import { mockRepo } from '../test-utils/mock-repo';

describe('ChatService', () => {
  let service: ChatService;
  let msgRepo: ReturnType<typeof mockRepo>;
  let agentsService: jest.Mocked<AgentsService>;
  let apiKeysService: jest.Mocked<ApiKeysService>;
  let llmService: jest.Mocked<LlmService>;

  const agentId = 'ag-1';
  const workspaceId = 'ws-1';

  const agent = {
    id: agentId,
    modelProvider: 'claude',
    modelName: 'claude-haiku-4-5',
    soulMd: 'You are helpful.',
    workspace: { id: workspaceId },
  } as any;

  beforeEach(async () => {
    msgRepo = mockRepo();

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatMessage), useValue: msgRepo },
        {
          provide: AgentsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ApiKeysService,
          useValue: {
            buildEnvForAgent: jest.fn().mockResolvedValue({ ANTHROPIC_API_KEY: 'sk-test' }),
          },
        },
        {
          provide: LlmService,
          useValue: {
            chat: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ChatService);
    agentsService = module.get(AgentsService) as jest.Mocked<AgentsService>;
    apiKeysService = module.get(ApiKeysService) as jest.Mocked<ApiKeysService>;
    llmService = module.get(LlmService) as jest.Mocked<LlmService>;
  });

  // ── sendMessage ────────────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    it('loads agent, loads history, calls LLM, saves messages, returns reply', async () => {
      agentsService.findOne.mockResolvedValue(agent);
      msgRepo.find.mockResolvedValue([]);
      llmService.chat.mockResolvedValue('Hello back!');
      msgRepo.create.mockImplementation((v) => v);
      msgRepo.save.mockResolvedValue([]);

      const reply = await service.sendMessage(agentId, workspaceId, 'Hello');

      expect(agentsService.findOne).toHaveBeenCalledWith(agentId, workspaceId);
      expect(msgRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { agent: { id: agentId } } }),
      );
      expect(llmService.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'claude',
          model: 'claude-haiku-4-5',
          systemPrompt: 'You are helpful.',
          messages: expect.arrayContaining([{ role: 'user', content: 'Hello' }]),
        }),
      );
      expect(msgRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello' }),
          expect.objectContaining({ role: 'assistant', content: 'Hello back!' }),
        ]),
      );
      expect(reply).toBe('Hello back!');
    });

    it('includes existing history in LLM context', async () => {
      agentsService.findOne.mockResolvedValue(agent);
      const history = [
        { role: 'user', content: 'Previous question', createdAt: new Date() },
        { role: 'assistant', content: 'Previous answer', createdAt: new Date() },
      ];
      msgRepo.find.mockResolvedValue(history as any);
      llmService.chat.mockResolvedValue('New reply');
      msgRepo.create.mockImplementation((v) => v);
      msgRepo.save.mockResolvedValue([]);

      await service.sendMessage(agentId, workspaceId, 'New question');

      const chatCall = llmService.chat.mock.calls[0][0];
      expect(chatCall.messages).toHaveLength(3); // 2 history + 1 new
      expect(chatCall.messages[0]).toEqual({ role: 'user', content: 'Previous question' });
      expect(chatCall.messages[2]).toEqual({ role: 'user', content: 'New question' });
    });

    it('propagates NotFoundException from AgentsService when agent not found', async () => {
      agentsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.sendMessage('bad-agent', workspaceId, 'Hi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getHistory ─────────────────────────────────────────────────────────────

  describe('getHistory()', () => {
    it('returns paginated messages for agent', async () => {
      agentsService.findOne.mockResolvedValue(agent);
      const messages = [{ id: 'm1', role: 'user', content: 'Hi' }];
      msgRepo.find.mockResolvedValue(messages as any);

      const result = await service.getHistory(agentId, workspaceId, 1, 50);

      expect(agentsService.findOne).toHaveBeenCalledWith(agentId, workspaceId);
      expect(msgRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agent: { id: agentId } },
          skip: 0,
          take: 50,
        }),
      );
      expect(result).toEqual(messages);
    });

    it('calculates skip from page number', async () => {
      agentsService.findOne.mockResolvedValue(agent);
      msgRepo.find.mockResolvedValue([]);

      await service.getHistory(agentId, workspaceId, 3, 25);

      expect(msgRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 25 }),
      );
    });
  });
});
