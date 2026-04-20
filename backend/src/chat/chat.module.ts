import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AgentsModule } from '../agents/agents.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { LlmModule } from '../llm/llm.module';
import { BillingModule } from '../billing/billing.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), forwardRef(() => AgentsModule), ApiKeysModule, LlmModule, BillingModule, LogsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
