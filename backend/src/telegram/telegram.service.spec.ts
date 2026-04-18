import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';
import { mockRepo } from '../test-utils/mock-repo';

// ── Mock node-telegram-bot-api ────────────────────────────────────────────────
// jest.mock is hoisted so factory cannot reference variables declared below it.

jest.mock('node-telegram-bot-api');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChannel(overrides = {}): AgentChannel {
  return {
    id: 'ch-1',
    channelType: 'telegram',
    config: { botToken: 'bot-token-123', chatId: '99999' },
    enabled: true,
    agent: { id: 'ag-1', workspace: { id: 'ws-1' } } as any,
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TelegramService', () => {
  let service: TelegramService;
  let channelRepo: ReturnType<typeof mockRepo>;
  let chatService: jest.Mocked<ChatService>;
  let MockTelegramBot: jest.Mock;
  let mockSendMessage: jest.Mock;

  beforeEach(async () => {
    channelRepo = mockRepo();

    MockTelegramBot = require('node-telegram-bot-api') as jest.Mock;
    mockSendMessage = jest.fn().mockResolvedValue({});
    MockTelegramBot.mockImplementation(() => ({ sendMessage: mockSendMessage }));

    const module = await Test.createTestingModule({
      providers: [
        TelegramService,
        { provide: getRepositoryToken(AgentChannel), useValue: channelRepo },
        {
          provide: ChatService,
          useValue: { sendMessage: jest.fn().mockResolvedValue('Agent reply') },
        },
      ],
    }).compile();

    service = module.get(TelegramService);
    chatService = module.get(ChatService) as jest.Mocked<ChatService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getBot ────────────────────────────────────────────────────────────────

  describe('getBot()', () => {
    it('creates a new TelegramBot with polling: false', () => {
      const bot = service.getBot('token-abc');

      expect(MockTelegramBot).toHaveBeenCalledWith('token-abc', { polling: false });
      expect(bot).toBeDefined();
    });

    it('caches bot instance — second call with same token returns same object', () => {
      const bot1 = service.getBot('token-same');
      const bot2 = service.getBot('token-same');

      expect(MockTelegramBot).toHaveBeenCalledTimes(1);
      expect(bot1).toBe(bot2);
    });

    it('creates separate instances for different tokens', () => {
      service.getBot('token-A');
      service.getBot('token-B');

      expect(MockTelegramBot).toHaveBeenCalledTimes(2);
    });
  });

  // ── findChannelByTelegram ──────────────────────────────────────────────────

  describe('findChannelByTelegram()', () => {
    it('queries by chatId with correct filters', async () => {
      const channel = makeChannel();
      channelRepo._qb.getOne.mockResolvedValue(channel);

      const result = await service.findChannelByTelegram('99999');

      expect(channelRepo.createQueryBuilder).toHaveBeenCalledWith('ch');
      expect(channelRepo._qb.where).toHaveBeenCalledWith(
        'ch.channelType = :type',
        { type: 'telegram' },
      );
      expect(channelRepo._qb.andWhere).toHaveBeenCalledWith(
        "ch.config->>'chatId' = :chatId",
        { chatId: '99999' },
      );
      expect(result).toEqual(channel);
    });

    it('returns null when no channel found', async () => {
      channelRepo._qb.getOne.mockResolvedValue(null);
      const result = await service.findChannelByTelegram('00000');
      expect(result).toBeNull();
    });
  });

  // ── handleIncomingMessage ─────────────────────────────────────────────────

  describe('handleIncomingMessage()', () => {
    it('calls chatService.sendMessage and sends reply via bot', async () => {
      const channel = makeChannel();

      await service.handleIncomingMessage(channel, '99999', 'Hello!');

      expect(chatService.sendMessage).toHaveBeenCalledWith('ag-1', 'ws-1', 'Hello!');
      expect(mockSendMessage).toHaveBeenCalledWith('99999', 'Agent reply');
    });
  });
});
