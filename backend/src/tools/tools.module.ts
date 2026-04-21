import { forwardRef, Module } from '@nestjs/common';
import { ToolExecutorService } from './tool-executor.service';
import { AgentsModule } from '../agents/agents.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [forwardRef(() => AgentsModule), WorkspacesModule],
  providers: [ToolExecutorService],
  exports: [ToolExecutorService],
})
export class ToolsModule {}
