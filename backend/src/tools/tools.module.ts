import { forwardRef, Module } from '@nestjs/common';
import { ToolExecutorService } from './tool-executor.service';
import { AgentsModule } from '../agents/agents.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [forwardRef(() => AgentsModule), WorkspacesModule, GmailModule],
  providers: [ToolExecutorService],
  exports: [ToolExecutorService],
})
export class ToolsModule {}
