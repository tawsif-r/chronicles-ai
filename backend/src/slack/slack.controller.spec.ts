import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSignature(signingSecret: string, timestamp: string, body: string): string {
  const base = `v0:${timestamp}:${body}`;
  return 'v0=' + createHmac('sha256', signingSecret).update(base).digest('hex');
}

const mockChannel = {
  id: 'ch-1',
  config: { signingSecret: 'test-secret', botToken: 'xoxb-test' },
  agent: { id: 'ag-1', workspace: { id: 'ws-1' } },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SlackController', () => {
  let app: INestApplication;
  let slackService: jest.Mocked<SlackService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlackController],
      providers: [
        {
          provide: SlackService,
          useValue: {
            findChannelBySlackEvent: jest.fn(),
            verifySignature: jest.fn().mockReturnValue(true),
            handleIncomingMessage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    // Enable rawBody parsing (needed by controller)
    app.use((req: any, _res: any, next: any) => {
      req.rawBody = Buffer.from(JSON.stringify(req.body ?? {}));
      next();
    });
    await app.init();

    slackService = module.get(SlackService) as jest.Mocked<SlackService>;
  });

  afterEach(async () => {
    await app.close();
  });

  // ── url_verification ───────────────────────────────────────────────────────

  it('responds with challenge for url_verification', async () => {
    const payload = { type: 'url_verification', challenge: 'test-challenge-token' };

    // NestJS pre-sets 201 for POST; res.json() without explicit res.status(200) uses that
    const res = await request(app.getHttpServer())
      .post('/webhooks/slack/events')
      .send(payload);

    expect(res.body.challenge).toBe('test-challenge-token');
  });

  // ── bot messages ───────────────────────────────────────────────────────────

  it('returns 200 without processing bot messages', async () => {
    const payload = {
      type: 'event_callback',
      team_id: 'T99999',
      event: { type: 'message', text: 'bot msg', channel: 'C12345', bot_id: 'B123', user: 'U123' },
    };

    await request(app.getHttpServer())
      .post('/webhooks/slack/events')
      .send(payload)
      .expect(200);

    expect(slackService.findChannelBySlackEvent).not.toHaveBeenCalled();
  });

  // ── channel not found ──────────────────────────────────────────────────────

  it('returns 200 when no matching channel found', async () => {
    slackService.findChannelBySlackEvent.mockResolvedValue(null);

    const payload = {
      type: 'event_callback',
      team_id: 'T00000',
      event: { type: 'message', text: 'Hello', channel: 'C00000', user: 'U123' },
    };

    await request(app.getHttpServer())
      .post('/webhooks/slack/events')
      .send(payload)
      .expect(200);
  });

  // ── invalid signature ──────────────────────────────────────────────────────

  it('returns 403 for invalid signature', async () => {
    slackService.findChannelBySlackEvent.mockResolvedValue(mockChannel as any);
    slackService.verifySignature.mockReturnValue(false);

    const payload = {
      type: 'event_callback',
      team_id: 'T99999',
      event: { type: 'message', text: 'Hello', channel: 'C12345', user: 'U123' },
    };

    await request(app.getHttpServer())
      .post('/webhooks/slack/events')
      .set('x-slack-signature', 'v0=invalid')
      .set('x-slack-request-timestamp', '1234567890')
      .send(payload)
      .expect(403);
  });

  // ── valid message event ────────────────────────────────────────────────────

  it('processes valid message event and returns 200', async () => {
    slackService.findChannelBySlackEvent.mockResolvedValue(mockChannel as any);
    slackService.verifySignature.mockReturnValue(true);

    const bodyStr = JSON.stringify({
      type: 'event_callback',
      team_id: 'T99999',
      event: { type: 'message', text: 'Hello agent!', channel: 'C12345', user: 'U123' },
    });

    const timestamp = '1234567890';

    await request(app.getHttpServer())
      .post('/webhooks/slack/events')
      .set('x-slack-signature', makeSignature('test-secret', timestamp, bodyStr))
      .set('x-slack-request-timestamp', timestamp)
      .set('Content-Type', 'application/json')
      .send(JSON.parse(bodyStr))
      .expect(200);

    // Give async processing time to run
    await new Promise((r) => setTimeout(r, 50));
    expect(slackService.handleIncomingMessage).toHaveBeenCalled();
  });
});
