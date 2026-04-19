import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './workspace.entity';
import { WorkspacesService } from './workspaces.service';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, User])],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
