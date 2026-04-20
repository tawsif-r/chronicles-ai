import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AgentSchedule } from './schedule.entity';
import { Agent } from '../agents/agent.entity';
import { SchedulesService, SCHEDULES_QUEUE } from './schedules.service';
import { ScheduleProcessor } from './schedule.processor';
import { SchedulesController } from './schedules.controller';
import { ChatModule } from '../chat/chat.module';
import { LogsModule } from '../logs/logs.module';
import { SlackModule } from '../slack/slack.module';
import { TelegramModule } from '../telegram/telegram.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentSchedule, Agent]),
    BullModule.registerQueue({ name: SCHEDULES_QUEUE }),
    forwardRef(() => ChatModule),
    LogsModule,
    SlackModule,
    TelegramModule,
    DiscordModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService, ScheduleProcessor],
  exports: [SchedulesService],
})
export class SchedulesModule {}
