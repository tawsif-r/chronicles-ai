import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Plan } from './plan.entity';
import { Subscription } from './subscription.entity';
import { Payment } from './payment.entity';
import { BillingService, BILLING_REDIS } from './billing.service';
import { BillingController } from './billing.controller';
import { PlanLimitGuard } from './plan-limit.guard';
import { NullPaymentProvider } from './null-payment.provider';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { Workspace } from '../workspaces/workspace.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Plan, Subscription, Payment, Workspace]),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    PlanLimitGuard,
    {
      provide: PAYMENT_PROVIDER,
      useClass: NullPaymentProvider,
    },
    {
      provide: BILLING_REDIS,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Redis = require('ioredis');
        return new Redis(cfg.getOrThrow<string>('REDIS_URL'));
      },
    },
  ],
  exports: [BillingService, PlanLimitGuard],
})
export class BillingModule {}
