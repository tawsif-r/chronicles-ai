import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentChannel } from '../agents/agent-channel.entity';
import { ChatModule } from '../chat/chat.module';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentChannel]),
    forwardRef(() => ChatModule),
  ],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
