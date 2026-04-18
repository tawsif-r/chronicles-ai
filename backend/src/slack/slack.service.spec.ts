import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { SlackService } from './slack.service';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatService } from '../chat/chat.service';
import { mockRepo } from '../test-utils/mock-repo';

// ── Mock @slack/web-api ───────────────────────────────────────────────────────

const mockPostMessage = jest.fn().mockResolvedValue({});
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: mockPostMessage },
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSignature(signingSecret: string, timestamp: string, body: string): string {
  const base = `v0:${timestamp}:${body}`;
  return 'v0=' + createHmac('sha256', signingSecret).update(base).digest('hex');
}

function makeChannel(overrides = {}): AgentChannel {
  return {
    id: 'ch-1',
    channelType: 'slack',
    config: {
      botToken: 'xoxb-test',
      signingSecret: 'test-signing-secret',
      slackChannelId: 'C12345',
      teamId: 'T99999',
    },
    enabled: true,
    agent: {
      id: 'ag-1',
      workspace: { id: 'ws-1' },
    } as any,
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SlackService', () => {
  let service: SlackService;
  let channelRepo: ReturnType<typeof mockRepo>;
  let chatService: jest.Mocked<ChatService>;

  beforeEach(async () => {
    channelRepo = mockRepo();
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SlackService,
        { provide: getRepositoryToken(AgentChannel), useValue: channelRepo },
        {
          provide: ChatService,
          useValue: { sendMessage: jest.fn().mockResolvedValue('Agent reply') },
        },
      ],
    }).compile();

    service = module.get(SlackService);
    chatService = module.get(ChatService) as jest.Mocked<ChatService>;
  });

  // ── verifySignature ────────────────────────────────────────────────────────

  describe('verifySignature()', () => {
    const signingSecret = 'test-signing-secret';
    const timestamp = '1609459200';
    const body = '{"type":"event_callback"}';

    it('returns true for valid HMAC-SHA256 signature', () => {
      const sig = makeSignature(signingSecret, timestamp, body);
      const result = service.verifySignature(signingSecret, timestamp, Buffer.from(body), sig);
      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const result = service.verifySignature(signingSecret, timestamp, Buffer.from(body), 'v0=bad');
      expect(result).toBe(false);
    });

    it('returns false for tampered body', () => {
      const sig = makeSignature(signingSecret, timestamp, body);
      const result = service.verifySignature(signingSecret, timestamp, Buffer.from('tampered'), sig);
      expect(result).toBe(false);
    });
  });

  // ── findChannelBySlackEvent ────────────────────────────────────────────────

  describe('findChannelBySlackEvent()', () => {
    it('queries by teamId and slackChannelId with correct filters', async () => {
      const channel = makeChannel();
      channelRepo._qb.getOne.mockResolvedValue(channel);

      const result = await service.findChannelBySlackEvent('T99999', 'C12345');

      expect(channelRepo.createQueryBuilder).toHaveBeenCalledWith('ch');
      expect(channelRepo._qb.where).toHaveBeenCalledWith(
        'ch.channelType = :type',
        { type: 'slack' },
      );
      expect(channelRepo._qb.andWhere).toHaveBeenCalledWith(
        "ch.config->>'teamId' = :teamId",
        { teamId: 'T99999' },
      );
      expect(channelRepo._qb.andWhere).toHaveBeenCalledWith(
        "ch.config->>'slackChannelId' = :slackChannelId",
        { slackChannelId: 'C12345' },
      );
      expect(result).toEqual(channel);
    });

    it('returns null when no matching channel found', async () => {
      channelRepo._qb.getOne.mockResolvedValue(null);
      const result = await service.findChannelBySlackEvent('T00000', 'C00000');
      expect(result).toBeNull();
    });
  });

  // ── handleIncomingMessage ──────────────────────────────────────────────────

  describe('handleIncomingMessage()', () => {
    it('calls chatService.sendMessage and sends reply back to Slack', async () => {
      const channel = makeChannel();

      await service.handleIncomingMessage(channel, 'Hello agent!', 'C12345');

      expect(chatService.sendMessage).toHaveBeenCalledWith('ag-1', 'ws-1', 'Hello agent!');
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: 'C12345',
        text: 'Agent reply',
      });
    });
  });

  // ── sendMessage ────────────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    it('instantiates WebClient with botToken and calls postMessage', async () => {
      const { WebClient } = require('@slack/web-api');

      await service.sendMessage('xoxb-test-token', 'C99999', 'Hello from agent');

      expect(WebClient).toHaveBeenCalledWith('xoxb-test-token');
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: 'C99999',
        text: 'Hello from agent',
      });
    });
  });
});
