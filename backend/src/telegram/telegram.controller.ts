import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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

@ApiTags('webhooks')
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
