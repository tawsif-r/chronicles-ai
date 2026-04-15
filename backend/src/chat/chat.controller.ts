import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { IsString } from 'class-validator';
import { ChatService } from './chat.service';
import type { RequestUser } from '../auth/jwt.strategy';

class SendMessageDto {
  @IsString()
  message: string;
}

@Controller('agents/:id/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async send(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    const reply = await this.chatService.sendMessage(id, workspaceId, dto.message);
    return { reply };
  }

  @Get('history')
  history(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    return this.chatService.getHistory(id, workspaceId, +page, +limit);
  }
}
