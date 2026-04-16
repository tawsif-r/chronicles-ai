import { forwardRef, Module } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [forwardRef(() => AgentsModule)],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
