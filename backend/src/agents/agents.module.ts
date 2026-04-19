import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './agent.entity';
import { AgentChannel } from './agent-channel.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { DiscordModule } from '../discord/discord.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentChannel]),
    WorkspacesModule,
    RuntimeModule,
    forwardRef(() => DiscordModule),
    BillingModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
