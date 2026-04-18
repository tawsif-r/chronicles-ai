import { Controller, Post, Req, Res } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { SlackService } from './slack.service';

interface SlackMessageEvent {
  type: string;
  text: string;
  channel: string;
  user: string;
  bot_id?: string;
  subtype?: string;
}

interface SlackEventPayload {
  type: string;
  team_id: string;
  challenge?: string;
  event?: SlackMessageEvent;
}

@Public()
@Controller('webhooks/slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  async handleEvent(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    const body = req.body as SlackEventPayload;

    // Handle url_verification challenge (no signature check needed)
    if (body.type === 'url_verification') {
      res.json({ challenge: body.challenge });
      return;
    }

    const event = body.event;
    if (
      !event ||
      event.type !== 'message' ||
      event.bot_id ||
      event.subtype
    ) {
      res.sendStatus(200);
      return;
    }

    const agentChannel = await this.slackService.findChannelBySlackEvent(
      body.team_id,
      event.channel,
    );
    if (!agentChannel) {
      res.sendStatus(200);
      return;
    }

    const sig = req.headers['x-slack-signature'] as string;
    const ts = req.headers['x-slack-request-timestamp'] as string;
    const valid = this.slackService.verifySignature(
      agentChannel.config.signingSecret,
      ts,
      req.rawBody!,
      sig,
    );
    if (!valid) {
      res.sendStatus(403);
      return;
    }

    // Respond 200 immediately so Slack doesn't retry, then process async
    res.sendStatus(200);

    await this.slackService.handleIncomingMessage(
      agentChannel,
      event.text,
      event.channel,
    );
  }
}
