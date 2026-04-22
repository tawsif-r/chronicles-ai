import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

describe('TelegramController', () => {
  let app: INestApplication;
  let telegramService: jest.Mocked<TelegramService>;

  const mockChannel = {
    id: 'ch-1',
    config: { botToken: 'bot-token-123', chatId: '99999' },
    agent: { id: 'ag-1', workspace: { id: 'ws-1' } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramController],
      providers: [
        {
          provide: TelegramService,
          useValue: {
            findChannelByBotToken: jest.fn(),
            handleIncomingMessage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    telegramService = module.get(TelegramService) as jest.Mocked<TelegramService>;
  });

  afterEach(async () => {
    await app.close();
  });

  // ── missing message ────────────────────────────────────────────────────────

  it('returns { ok: true } when update has no message', async () => {
    const res = await request(app.getHttpServer())
      .post('/webhooks/telegram/my-bot-token')
      .send({ update_id: 1 })
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(telegramService.findChannelByBotToken).not.toHaveBeenCalled();
  });

  // ── no matching channel ────────────────────────────────────────────────────

  it('returns { ok: true } when no channel found for chat ID', async () => {
    telegramService.findChannelByBotToken.mockResolvedValue(null);

    const update = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 99999 }, text: 'Hello' },
    };

    const res = await request(app.getHttpServer())
      .post('/webhooks/telegram/my-bot-token')
      .send(update)
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(telegramService.handleIncomingMessage).not.toHaveBeenCalled();
  });

  // ── valid message ──────────────────────────────────────────────────────────

  it('routes message to handleIncomingMessage and returns { ok: true }', async () => {
    telegramService.findChannelByBotToken.mockResolvedValue(mockChannel as any);

    const update = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 99999 }, text: 'Hello agent!' },
    };

    const res = await request(app.getHttpServer())
      .post('/webhooks/telegram/my-bot-token')
      .send(update)
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(telegramService.findChannelByBotToken).toHaveBeenCalledWith('my-bot-token');
    expect(telegramService.handleIncomingMessage).toHaveBeenCalledWith(
      mockChannel,
      '99999',
      'Hello agent!',
    );
  });
});
