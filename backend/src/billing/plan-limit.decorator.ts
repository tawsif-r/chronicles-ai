import { SetMetadata } from '@nestjs/common';

export type PlanFeature = 'agents' | 'channels' | 'messages';
export const PLAN_LIMIT_KEY = 'plan_limit_feature';
export const PlanLimit = (feature: PlanFeature) => SetMetadata(PLAN_LIMIT_KEY, feature);
