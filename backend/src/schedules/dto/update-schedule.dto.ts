import { IsBoolean, IsIn, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  prompt?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['owner', 'broadcast', 'personalized', 'none'])
  telegramDispatch?: string;
}
