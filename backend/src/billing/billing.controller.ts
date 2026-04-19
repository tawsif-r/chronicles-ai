import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { Public } from '../auth/public.decorator';
import type { RequestUser } from '../auth/jwt.strategy';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plan')
  getMyPlan(@Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.billingService.getUsage(workspaceId);
  }

  @Public()
  @Get('plans')
  listPlans() {
    return this.billingService.listPlans();
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  upgrade() {
    return { message: 'Payment gateway not configured yet. Contact admin to upgrade.' };
  }
}
