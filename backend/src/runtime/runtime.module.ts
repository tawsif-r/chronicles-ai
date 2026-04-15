import { forwardRef, Module } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { AgentsModule } from '../agents/agents.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    forwardRef(() => AgentsModule),
    WorkspacesModule,
    ApiKeysModule,
    LogsModule,
  ],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
