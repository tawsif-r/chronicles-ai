import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanName } from './plan.entity';
import { Subscription } from './subscription.entity';
import { Workspace } from '../workspaces/workspace.entity';

export const BILLING_REDIS = 'BILLING_REDIS';

interface RedisClient {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

const PLAN_SEEDS: Array<Partial<Plan>> = [
  {
    name: 'FREE',
    maxAgents: 1,
    maxChannelsPerAgent: 1,
    maxMessagesPerMonth: 1000,
    logRetentionDays: 7,
    allowedProviders: ['anthropic'],
    priceMonthly: 0,
  },
  {
    name: 'PRO',
    maxAgents: 5,
    maxChannelsPerAgent: 3,
    maxMessagesPerMonth: 20000,
    logRetentionDays: 30,
    allowedProviders: ['anthropic', 'openai', 'openrouter', 'ollama'],
    priceMonthly: 19,
  },
  {
    name: 'MAX',
    maxAgents: -1,
    maxChannelsPerAgent: -1,
    maxMessagesPerMonth: -1,
    logRetentionDays: 90,
    allowedProviders: ['anthropic', 'openai', 'openrouter', 'ollama'],
    priceMonthly: 49,
  },
];

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @Inject(BILLING_REDIS)
    private readonly redis: RedisClient,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
    await this.seedMissingSubscriptions();
  }

  private async seedPlans() {
    const count = await this.planRepo.count();
    if (count > 0) return;
    for (const seed of PLAN_SEEDS) {
      await this.planRepo.save(this.planRepo.create(seed));
    }
    this.logger.log('Seeded FREE/PRO/MAX plans');
  }

  private async seedMissingSubscriptions() {
    const freePlan = await this.planRepo.findOneBy({ name: 'FREE' });
    if (!freePlan) return;

    const workspacesWithoutSub = await this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoin('subscriptions', 'sub', 'sub."workspaceId" = ws.id')
      .where('sub.id IS NULL')
      .getMany();

    for (const workspace of workspacesWithoutSub) {
      await this.subRepo.save(
        this.subRepo.create({
          workspace,
          plan: freePlan,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          externalId: null,
          cancelledAt: null,
        }),
      );
    }

    if (workspacesWithoutSub.length > 0) {
      this.logger.log(`Assigned FREE plan to ${workspacesWithoutSub.length} existing workspaces`);
    }
  }

  async getSubscription(workspaceId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({
      where: { workspace: { id: workspaceId } },
      relations: ['plan'],
    });
    if (!sub) {
      const freePlan = await this.planRepo.findOneByOrFail({ name: 'FREE' });
      return this.subRepo.save(
        this.subRepo.create({
          workspace: { id: workspaceId } as Workspace,
          plan: freePlan,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          externalId: null,
          cancelledAt: null,
        }),
      );
    }
    return sub;
  }

  async checkAgentLimit(workspaceId: string): Promise<void> {
    const sub = await this.getSubscription(workspaceId);
    const { maxAgents } = sub.plan;
    if (maxAgents === -1) return;

    const count = await this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoin('ws.agents', 'agent')
      .select('COUNT(agent.id)', 'cnt')
      .where('ws.id = :workspaceId', { workspaceId })
      .getRawOne<{ cnt: string }>();

    if (Number(count?.cnt ?? 0) >= maxAgents) {
      throw new ForbiddenException(
        `Your ${sub.plan.name} plan allows up to ${maxAgents} agent(s). Upgrade to create more.`,
      );
    }
  }

  async checkChannelLimit(agentId: string, workspaceId: string): Promise<void> {
    const sub = await this.getSubscription(workspaceId);
    const { maxChannelsPerAgent } = sub.plan;
    if (maxChannelsPerAgent === -1) return;

    const count = await this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoin('ws.agents', 'agent')
      .leftJoin('agent.channels', 'ch')
      .select('COUNT(ch.id)', 'cnt')
      .where('ws.id = :workspaceId', { workspaceId })
      .andWhere('agent.id = :agentId', { agentId })
      .getRawOne<{ cnt: string }>();

    if (Number(count?.cnt ?? 0) >= maxChannelsPerAgent) {
      throw new ForbiddenException(
        `Your ${sub.plan.name} plan allows up to ${maxChannelsPerAgent} channel(s) per agent. Upgrade to add more.`,
      );
    }
  }

  async checkMessageLimit(workspaceId: string): Promise<void> {
    const sub = await this.getSubscription(workspaceId);
    const { maxMessagesPerMonth } = sub.plan;
    if (maxMessagesPerMonth === -1) return;

    const key = this.msgKey(workspaceId);
    const count = Number(await this.redis.get(key) ?? 0);
    if (count >= maxMessagesPerMonth) {
      throw new ForbiddenException(
        `Your ${sub.plan.name} plan allows ${maxMessagesPerMonth} messages/month. Upgrade or wait until next month.`,
      );
    }
  }

  async incrementMessageCount(workspaceId: string): Promise<void> {
    const key = this.msgKey(workspaceId);
    const ttl = await this.redis.ttl(key);
    await this.redis.incr(key);
    if (ttl < 0) {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const secondsLeft = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);
      await this.redis.expire(key, secondsLeft);
    }
  }

  async getUsage(workspaceId: string): Promise<{
    plan: string;
    usage: {
      agents: { used: number; limit: number };
      channels: { used: number; limit: number };
      messagesThisMonth: { used: number; limit: number };
    };
  }> {
    const sub = await this.getSubscription(workspaceId);
    const { plan } = sub;

    const agentRow = await this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoin('ws.agents', 'agent')
      .select('COUNT(agent.id)', 'cnt')
      .where('ws.id = :workspaceId', { workspaceId })
      .getRawOne<{ cnt: string }>();

    const channelRow = await this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoin('ws.agents', 'agent')
      .leftJoin('agent.channels', 'ch')
      .select('COUNT(ch.id)', 'cnt')
      .where('ws.id = :workspaceId', { workspaceId })
      .getRawOne<{ cnt: string }>();

    const msgCount = Number(await this.redis.get(this.msgKey(workspaceId)) ?? 0);

    return {
      plan: plan.name,
      usage: {
        agents: { used: Number(agentRow?.cnt ?? 0), limit: plan.maxAgents },
        channels: { used: Number(channelRow?.cnt ?? 0), limit: plan.maxChannelsPerAgent },
        messagesThisMonth: { used: msgCount, limit: plan.maxMessagesPerMonth },
      },
    };
  }

  async listPlans(): Promise<Plan[]> {
    return this.planRepo.find({ order: { priceMonthly: 'ASC' } });
  }

  async upgradePlan(workspaceId: string, planName: PlanName): Promise<Subscription> {
    const sub = await this.getSubscription(workspaceId);
    const plan = await this.planRepo.findOneByOrFail({ name: planName });
    sub.plan = plan;
    sub.status = 'active';
    return this.subRepo.save(sub);
  }

  private msgKey(workspaceId: string): string {
    const now = new Date();
    return `billing:${workspaceId}:msgs:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
