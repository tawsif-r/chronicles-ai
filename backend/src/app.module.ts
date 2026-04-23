import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { AgentsModule } from './agents/agents.module';
import { RuntimeModule } from './runtime/runtime.module';
import { ChatModule } from './chat/chat.module';
import { LogsModule } from './logs/logs.module';
import { SkillsModule } from './skills/skills.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { LlmModule } from './llm/llm.module';
import { SlackModule } from './slack/slack.module';
import { TelegramModule } from './telegram/telegram.module';
import { DiscordModule } from './discord/discord.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { BillingModule } from './billing/billing.module';
import { SchedulesModule } from './schedules/schedules.module';
import { GmailModule } from './gmail/gmail.module';
import { DocumentsModule } from './documents/documents.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

// Entities
import { User } from './users/user.entity';
import { Workspace } from './workspaces/workspace.entity';
import { Agent } from './agents/agent.entity';
import { AgentChannel } from './agents/agent-channel.entity';
import { ChatMessage } from './chat/chat-message.entity';
import { AgentLog } from './logs/log.entity';
import { Skill } from './skills/skill.entity';
import { AgentSkill } from './skills/agent-skill.entity';
import { ApiKey } from './api-keys/api-key.entity';
import { Plan } from './billing/plan.entity';
import { Subscription } from './billing/subscription.entity';
import { Payment } from './billing/payment.entity';
import { AgentSchedule } from './schedules/schedule.entity';
import { GmailIntegration } from './gmail/gmail-integration.entity';
import { Document } from './documents/document.entity';
import { DocumentChunk } from './documents/document-chunk.entity';

const ALL_ENTITIES = [
  User,
  Workspace,
  Agent,
  AgentChannel,
  ChatMessage,
  AgentLog,
  Skill,
  AgentSkill,
  ApiKey,
  Plan,
  Subscription,
  Payment,
  AgentSchedule,
  GmailIntegration,
  Document,
  DocumentChunk,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.getOrThrow<string>('DATABASE_URL'),
        entities: ALL_ENTITIES,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: cfg.getOrThrow<string>('REDIS_URL'),
      }),
    }),

    AuthModule,
    UsersModule,
    WorkspacesModule,
    AgentsModule,
    RuntimeModule,
    ChatModule,
    LogsModule,
    SkillsModule,
    ApiKeysModule,
    LlmModule,
    SlackModule,
    TelegramModule,
    DiscordModule,
    WhatsappModule,
    BillingModule,
    SchedulesModule,
    GmailModule,
    DocumentsModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally; routes opt out with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
