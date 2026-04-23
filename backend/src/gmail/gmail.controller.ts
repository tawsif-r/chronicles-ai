import { Controller, Delete, Get, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GmailService } from './gmail.service';
import { Public } from '../auth/public.decorator';
import type { RequestUser } from '../auth/jwt.strategy';

@ApiTags('gmail')
@ApiBearerAuth()
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth')
  initiateAuth(@Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    const url = this.gmailService.getAuthUrl(workspaceId);
    return { url };
  }

  @Get('callback')
  @Public()
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.gmailService.handleCallback(code, state);
    res.redirect('http://localhost:5173/settings?gmail=connected');
  }

  @Get('status')
  getStatus(@Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.gmailService.getStatus(workspaceId);
  }

  @Delete('disconnect')
  disconnect(@Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.gmailService.disconnect(workspaceId);
  }
}
