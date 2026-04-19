import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AgentsService } from './agents.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RuntimeService } from '../runtime/runtime.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import type { RequestUser } from '../auth/jwt.strategy';
import { PlanLimit } from '../billing/plan-limit.decorator';
import { PlanLimitGuard } from '../billing/plan-limit.guard';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly workspacesService: WorkspacesService,
    private readonly runtimeService: RuntimeService,
  ) {}

  @Get()
  findAll(@Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.agentsService.findAll(workspaceId);
  }

  @Post()
  @UseGuards(PlanLimitGuard)
  @PlanLimit('agents')
  async create(@Body() dto: CreateAgentDto, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    const workspace = await this.workspacesService.findById(workspaceId);
    return this.agentsService.create(dto, workspace!);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.agentsService.findOne(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    return this.agentsService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    await this.runtimeService.stop(id, workspaceId);
    await this.agentsService.remove(id, workspaceId);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.runtimeService.start(id, workspaceId);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.runtimeService.stop(id, workspaceId);
  }

  @Post(':id/restart')
  restart(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.runtimeService.restart(id, workspaceId);
  }

  @Post(':id/channels')
  @UseGuards(PlanLimitGuard)
  @PlanLimit('channels')
  addChannel(
    @Param('id') id: string,
    @Body() dto: CreateChannelDto,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    return this.agentsService.addChannel(id, workspaceId, dto);
  }

  @Patch(':id/channels/:channelId')
  updateChannel(
    @Param('id') id: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    return this.agentsService.updateChannel(id, workspaceId, channelId, dto);
  }

  @Delete(':id/channels/:channelId')
  removeChannel(
    @Param('id') id: string,
    @Param('channelId') channelId: string,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    return this.agentsService.removeChannel(id, workspaceId, channelId);
  }

  @Get(':id/status')
  async status(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    const agent = await this.agentsService.findOne(id, workspaceId);
    return { status: agent.status, gatewayPort: agent.gatewayPort };
  }

  @Get(':id/memory')
  async getMemory(@Param('id') id: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    const agent = await this.agentsService.findOne(id, workspaceId);
    const workspace = await this.workspacesService.findById(workspaceId);
    const content = await this.agentsService.getMemory(agent, workspace!);
    return { content };
  }

  @Patch(':id/memory')
  async setMemory(
    @Param('id') id: string,
    @Body('content') content: string,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    const agent = await this.agentsService.findOne(id, workspaceId);
    const workspace = await this.workspacesService.findById(workspaceId);
    await this.agentsService.setMemory(agent, workspace!, content);
  }
}
