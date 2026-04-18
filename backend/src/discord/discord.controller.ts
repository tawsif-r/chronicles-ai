import { Controller, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { DiscordService } from './discord.service';

@Public()
@Controller('webhooks/discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Post(':botToken')
  async initBot(@Param('botToken') botToken: string, @Res() res: Response): Promise<void> {
    try {
      await this.discordService.init(botToken);
      res.status(200).json({ ok: true, message: 'Discord bot initialized' });
    } catch {
      res.status(400).json({ ok: false, message: 'Failed to initialize bot' });
    }
  }
}
