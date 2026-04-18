import { IsEnum, IsObject, IsOptional, IsBoolean } from 'class-validator';
import type { ChannelType } from '@chronicles/shared';

export class CreateChannelDto {
  @IsEnum(['telegram', 'slack', 'discord', 'whatsapp'])
  channelType: ChannelType;

  @IsObject()
  config: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
