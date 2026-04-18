import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappController', () => {
  let app: INestApplication;
  let whatsappService: jest.Mocked<WhatsappService>;

  const mockChannel = {
    id: 'ch-1',
    config: { accountSid: 'ACtest', authToken: 'auth', phoneNumber: '+15551234567' },
    agent: { id: 'ag-1', workspace: { id: 'ws-1' } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        {
          provide: WhatsappService,
          useValue: {
            findChannelByPhoneNumber: jest.fn(),
            handleIncomingMessage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    whatsappService = module.get(WhatsappService) as jest.Mocked<WhatsappService>;
  });

  afterEach(async () => {
    await app.close();
  });

  // ── missing body fields ────────────────────────────────────────────────────

  it('returns 200 without processing when Body is missing', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ From: '+15559876543' })
      .expect(200);

    expect(whatsappService.findChannelByPhoneNumber).not.toHaveBeenCalled();
  });

  it('returns 200 without processing when From is missing', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ Body: 'Hello' })
      .expect(200);

    expect(whatsappService.findChannelByPhoneNumber).not.toHaveBeenCalled();
  });

  // ── channel not found ──────────────────────────────────────────────────────

  it('returns 200 when no channel found for phone number', async () => {
    whatsappService.findChannelByPhoneNumber.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ From: 'whatsapp:+15559876543', Body: 'Hello' })
      .expect(200);

    expect(whatsappService.handleIncomingMessage).not.toHaveBeenCalled();
  });

  // ── valid message ──────────────────────────────────────────────────────────

  it('routes valid message to handleIncomingMessage and returns 200', async () => {
    whatsappService.findChannelByPhoneNumber.mockResolvedValue(mockChannel as any);

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ From: 'whatsapp:+15559876543', Body: 'Hello agent!' })
      .expect(200);

    expect(whatsappService.findChannelByPhoneNumber).toHaveBeenCalledWith('whatsapp:+15559876543');
    expect(whatsappService.handleIncomingMessage).toHaveBeenCalledWith(
      mockChannel,
      'whatsapp:+15559876543',
      'Hello agent!',
    );
  });
});
