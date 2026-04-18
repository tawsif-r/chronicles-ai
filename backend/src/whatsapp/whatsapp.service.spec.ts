import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';
import { mockRepo } from '../test-utils/mock-repo';

// ── Mock twilio ────────────────────────────────────────────────────────────────
// jest.mock is hoisted, so factory cannot reference variables declared below it.
// Use require('twilio') inside tests to get the mocked constructor.

jest.mock('twilio');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChannel(overrides = {}): AgentChannel {
  return {
    id: 'ch-1',
    channelType: 'whatsapp',
    config: {
      accountSid: 'ACtest123',
      authToken: 'auth-token-test',
      phoneNumber: '+15551234567',
    },
    enabled: true,
    agent: { id: 'ag-1', workspace: { id: 'ws-1' } } as any,
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WhatsappService', () => {
  let service: WhatsappService;
  let channelRepo: ReturnType<typeof mockRepo>;
  let chatService: jest.Mocked<ChatService>;
  let MockTwilio: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    channelRepo = mockRepo();

    // twilio exports named { Twilio }, not a default export
    MockTwilio = require('twilio').Twilio as jest.Mock;
    mockCreate = jest.fn().mockResolvedValue({ sid: 'SM-test' });
    MockTwilio.mockImplementation(() => ({ messages: { create: mockCreate } }));

    const module = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: getRepositoryToken(AgentChannel), useValue: channelRepo },
        {
          provide: ChatService,
          useValue: { sendMessage: jest.fn().mockResolvedValue('Agent reply') },
        },
      ],
    }).compile();

    service = module.get(WhatsappService);
    chatService = module.get(ChatService) as jest.Mocked<ChatService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findChannelByPhoneNumber ───────────────────────────────────────────────

  describe('findChannelByPhoneNumber()', () => {
    it('queries type=whatsapp with accountSid and enabled filters', async () => {
      const channel = makeChannel();
      channelRepo._qb.getOne.mockResolvedValue(channel);

      const result = await service.findChannelByPhoneNumber('+15559876543');

      expect(channelRepo.createQueryBuilder).toHaveBeenCalledWith('ch');
      expect(channelRepo._qb.where).toHaveBeenCalledWith(
        'ch.channelType = :type',
        { type: 'whatsapp' },
      );
      expect(channelRepo._qb.andWhere).toHaveBeenCalledWith(
        "ch.config->>'accountSid' IS NOT NULL",
      );
      expect(channelRepo._qb.andWhere).toHaveBeenCalledWith('ch.enabled = true');
      expect(result).toEqual(channel);
    });

    it('returns null when no whatsapp channel found', async () => {
      channelRepo._qb.getOne.mockResolvedValue(null);
      const result = await service.findChannelByPhoneNumber('+15550000000');
      expect(result).toBeNull();
    });
  });

  // ── handleIncomingMessage ─────────────────────────────────────────────────

  describe('handleIncomingMessage()', () => {
    it('calls chatService.sendMessage and sends reply via Twilio', async () => {
      const channel = makeChannel();

      await service.handleIncomingMessage(channel, '+15559876543', 'Hello WhatsApp!');

      expect(chatService.sendMessage).toHaveBeenCalledWith('ag-1', 'ws-1', 'Hello WhatsApp!');
    });

    it('instantiates Twilio with accountSid and authToken from config', async () => {
      const channel = makeChannel();

      await service.handleIncomingMessage(channel, '+15559876543', 'Hi');

      expect(MockTwilio).toHaveBeenCalledWith('ACtest123', 'auth-token-test');
    });

    it('formats from/to numbers with whatsapp: prefix', async () => {
      const channel = makeChannel();

      await service.handleIncomingMessage(channel, '+15559876543', 'Hi');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'whatsapp:+15551234567',
          to: 'whatsapp:+15559876543',
          body: 'Agent reply',
        }),
      );
    });
  });
});
