import { SubscriptionStatus } from './subscription.entity';

export interface WebhookEvent {
  type: string;
  workspaceId?: string;
  planName?: string;
  externalId?: string;
}

export interface IPaymentProvider {
  createCheckoutSession(planName: string, workspaceId: string): Promise<string | null>;
  cancelSubscription(externalId: string): Promise<void>;
  getSubscriptionStatus(externalId: string): Promise<SubscriptionStatus>;
  handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
