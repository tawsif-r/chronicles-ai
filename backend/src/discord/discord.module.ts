import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatModule } from '../chat/chat.module';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentChannel]),
    forwardRef(() => ChatModule),
  ],
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
