import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Workspace } from './workspace.entity';
import { User } from '../users/user.entity';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly repo: Repository<Workspace>,
    private readonly cfg: ConfigService,
  ) {}

  async createForUser(user: User): Promise<Workspace> {
    const basePath = this.cfg.get('WORKSPACE_BASE_PATH', '/workspaces');
    // We need the workspace id before we can set diskPath, so save twice.
    const ws = await this.repo.save(
      this.repo.create({ name: `${user.email}'s workspace`, diskPath: '' }),
    );
    ws.diskPath = path.join(basePath, ws.id);
    return this.repo.save(ws);
  }

  findByUserId(userId: string): Promise<Workspace> {
    // User.workspace is a OneToOne with @JoinColumn — the FK column is `workspaceId` on users.
    return this.repo
      .createQueryBuilder('ws')
      .innerJoin('users', 'u', 'u."workspaceId" = ws.id')
      .where('u.id = :userId', { userId })
      .getOneOrFail();
  }

  findById(id: string): Promise<Workspace | null> {
    return this.repo.findOne({ where: { id } });
  }
}
