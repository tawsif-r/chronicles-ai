import { forwardRef, Module } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { AgentsModule } from '../agents/agents.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [forwardRef(() => AgentsModule), LogsModule],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
