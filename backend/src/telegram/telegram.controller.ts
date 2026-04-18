import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { TelegramService } from './telegram.service';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text: string;
  };
}

@Public()
@Controller('webhooks/telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post(':token')
  async handleWebhook(
    @Body() update: TelegramUpdate,
  ): Promise<{ ok: boolean }> {
    if (!update.message?.text) {
      return { ok: true };
    }

    const chatId = String(update.message.chat.id);
    const agentChannel = await this.telegramService.findChannelByTelegram(chatId);
    if (!agentChannel) {
      return { ok: true };
    }

    await this.telegramService.handleIncomingMessage(
      agentChannel,
      chatId,
      update.message.text,
    );

    return { ok: true };
  }
}
