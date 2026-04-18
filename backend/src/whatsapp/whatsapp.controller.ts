import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { WhatsappService } from './whatsapp.service';

interface WhatsappIncoming {
  From: string;
  Body: string;
}

@Public()
@Controller('webhooks/whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post()
  async handleIncoming(
    @Body() payload: WhatsappIncoming,
    @Res() res: Response,
  ): Promise<void> {
    if (!payload.Body || !payload.From) {
      res.sendStatus(200);
      return;
    }

    const agentChannel = await this.whatsappService.findChannelByPhoneNumber(payload.From);
    if (!agentChannel) {
      res.sendStatus(200);
      return;
    }

    await this.whatsappService.handleIncomingMessage(
      agentChannel,
      payload.From,
      payload.Body,
    );

    res.sendStatus(200);
  }
}
