import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiscordService } from './discord.service';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';
import { mockRepo } from '../test-utils/mock-repo';

// ── Mock discord.js ────────────────────────────────────────────────────────────
// jest.mock is hoisted so factory cannot reference variables declared below it.

jest.mock('discord.js', () => ({
  Client: jest.fn(),
  GatewayIntentBits: { MessageContent: 1, DirectMessages: 2 },
  ChannelType: {},
  REST: jest.fn(),
  Routes: {},
}));

// Mocks assigned in beforeEach after jest.mock hoisting
let mockLogin: jest.Mock;
let mockFetch: jest.Mock;
let mockSend: jest.Mock;
let mockOn: jest.Mock;
let mockIsReady: jest.Mock;
let MockClient: jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChannel(overrides = {}): AgentChannel {
  return {
    id: 'ch-1',
    channelType: 'discord',
    config: { botToken: 'discord-bot-token', userId: 'user-12345' },
    enabled: true,
    agent: { id: 'ag-1', workspace: { id: 'ws-1' } } as any,
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DiscordService', () => {
  let service: DiscordService;
  let channelRepo: ReturnType<typeof mockRepo>;
  let chatService: jest.Mocked<ChatService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    channelRepo = mockRepo();

    MockClient = require('discord.js').Client as jest.Mock;
    mockLogin = jest.fn().mockResolvedValue(undefined);
    mockFetch = jest.fn();
    mockSend = jest.fn().mockResolvedValue({});
    mockOn = jest.fn();
    mockIsReady = jest.fn().mockReturnValue(true);

    MockClient.mockImplementation(() => ({
      on: mockOn,
      login: mockLogin,
      isReady: mockIsReady,
      users: { fetch: mockFetch },
    }));

    const module = await Test.createTestingModule({
      providers: [
        DiscordService,
        { provide: getRepositoryToken(AgentChannel), useValue: channelRepo },
        {
          provide: ChatService,
          useValue: { sendMessage: jest.fn().mockResolvedValue('Agent reply') },
        },
      ],
    }).compile();

    service = module.get(DiscordService);
    chatService = module.get(ChatService) as jest.Mocked<ChatService>;
  });

  // ── init ──────────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('creates Discord Client, registers messageCreate listener, and logs in', async () => {
      await service.init('discord-bot-token');

      expect(MockClient).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith('messageCreate', expect.any(Function));
      expect(mockLogin).toHaveBeenCalledWith('discord-bot-token');
    });

    it('skips re-initialization when already initialized', async () => {
      await service.init('discord-bot-token');
      await service.init('discord-bot-token');

      expect(MockClient).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  // ── findChannelByDiscordDM ─────────────────────────────────────────────────

  describe('findChannelByDiscordDM()', () => {
    it('queries by userId with correct filters', async () => {
      const channel = makeChannel();
      channelRepo._qb.getOne.mockResolvedValue(channel);

      const result = await service.findChannelByDiscordDM('user-12345');

      expect(channelRepo.createQueryBuilder).toHaveBeenCalledWith('ch');
      expect(channelRepo._qb.where).toHaveBeenCalledWith(
        'ch.channelType = :type',
        { type: 'discord' },
      );
      expect(channelRepo._qb.andWhere).toHaveBeenCalledWith(
        "ch.config->>'userId' = :userId",
        { userId: 'user-12345' },
      );
      expect(result).toEqual(channel);
    });

    it('returns null when no channel found', async () => {
      channelRepo._qb.getOne.mockResolvedValue(null);
      const result = await service.findChannelByDiscordDM('unknown-user');
      expect(result).toBeNull();
    });
  });

  // ── handleIncomingMessage ─────────────────────────────────────────────────

  describe('handleIncomingMessage()', () => {
    it('calls chatService.sendMessage and sends reply via user.send()', async () => {
      await service.init('discord-bot-token');

      const mockUser = { send: mockSend };
      mockFetch.mockResolvedValue(mockUser);

      const channel = makeChannel();
      await service.handleIncomingMessage(channel, 'user-12345', 'Hello Discord!');

      expect(chatService.sendMessage).toHaveBeenCalledWith('ag-1', 'ws-1', 'Hello Discord!');
      expect(mockFetch).toHaveBeenCalledWith('user-12345');
      expect(mockSend).toHaveBeenCalledWith('Agent reply');
    });

    it('does not send if client not ready', async () => {
      // Client never initialized
      mockIsReady.mockReturnValue(false);

      const channel = makeChannel();
      await service.handleIncomingMessage(channel, 'user-12345', 'Hello!');

      // ChatService still called, but no user.send
      expect(chatService.sendMessage).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
