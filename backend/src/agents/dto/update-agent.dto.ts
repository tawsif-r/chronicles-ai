import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { ModelProvider } from '@chronicles/shared';

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['claude', 'openai', 'ollama'])
  modelProvider?: ModelProvider;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  soulMd?: string;

  @IsOptional()
  @IsString()
  toolsMd?: string;

  @IsOptional()
  @IsString()
  identityMd?: string;

  @IsOptional()
  @IsString()
  heartbeatMd?: string;
}
