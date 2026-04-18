import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
