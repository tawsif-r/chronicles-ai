import { Injectable } from '@nestjs/common';
import { IPaymentProvider, WebhookEvent } from './payment-provider.interface';
import { SubscriptionStatus } from './subscription.entity';

// No-op provider used until a real payment gateway is configured.
// Swap in StripePaymentProvider (or similar) by changing BillingModule.
@Injectable()
export class NullPaymentProvider implements IPaymentProvider {
  createCheckoutSession(_planName: string, _workspaceId: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  cancelSubscription(_externalId: string): Promise<void> {
    return Promise.resolve();
  }

  getSubscriptionStatus(_externalId: string): Promise<SubscriptionStatus> {
    return Promise.resolve('active');
  }

  handleWebhook(_payload: Buffer, _signature: string): Promise<WebhookEvent> {
    return Promise.resolve({ type: 'noop' });
  }
}
