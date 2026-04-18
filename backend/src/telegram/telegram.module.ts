import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatModule } from '../chat/chat.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentChannel]),
    forwardRef(() => ChatModule),
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
