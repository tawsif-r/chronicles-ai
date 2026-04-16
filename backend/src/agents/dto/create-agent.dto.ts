import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import type { ModelProvider } from '@chronicles/shared';

export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(['claude', 'openai', 'ollama', 'openrouter'])
  modelProvider: ModelProvider;

  @IsString()
  @MinLength(1)
  modelName: string;

  @IsOptional()
  @IsString()
  soulMd?: string;

  @IsOptional()
  @IsString()
  toolsMd?: string;
}
