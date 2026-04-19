import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { PLAN_LIMIT_KEY, PlanFeature } from './plan-limit.decorator';
import type { RequestUser } from '../auth/jwt.strategy';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<PlanFeature>(PLAN_LIMIT_KEY, context.getHandler());
    if (!feature) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const { workspaceId } = req.user as RequestUser;
    const agentId = req.params['id'] as string;

    switch (feature) {
      case 'agents':
        await this.billingService.checkAgentLimit(workspaceId);
        break;
      case 'channels':
        await this.billingService.checkChannelLimit(agentId, workspaceId);
        break;
      case 'messages':
        await this.billingService.checkMessageLimit(workspaceId);
        break;
    }

    return true;
  }
}
