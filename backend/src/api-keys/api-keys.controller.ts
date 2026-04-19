import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { IsEnum, IsString } from 'class-validator';
import { ApiKeysService } from './api-keys.service';
import type { RequestUser } from '../auth/jwt.strategy';

class StoreKeyDto {
  @IsEnum(['anthropic', 'openai', 'ollama', 'openrouter'])
  provider: string;

  @IsString()
  key: string;
}

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  list(@Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.apiKeysService.listForWorkspace(workspaceId);
  }

  @Post()
  store(@Body() dto: StoreKeyDto, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.apiKeysService.store(workspaceId, dto.provider, dto.key);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.apiKeysService.remove(id, workspaceId);
  }
}
