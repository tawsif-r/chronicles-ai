import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import type { RequestUser } from '../auth/jwt.strategy';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('agents/:id/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  list(@Param('id') agentId: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.schedulesService.findAll(agentId, workspaceId);
  }

  @Post()
  create(@Param('id') agentId: string, @Body() dto: CreateScheduleDto, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.schedulesService.create(agentId, workspaceId, dto);
  }

  @Patch(':sid')
  update(
    @Param('sid') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
    @Req() req: Request,
  ) {
    const { workspaceId } = req.user as RequestUser;
    return this.schedulesService.update(scheduleId, workspaceId, dto);
  }

  @Delete(':sid')
  remove(@Param('sid') scheduleId: string, @Req() req: Request) {
    const { workspaceId } = req.user as RequestUser;
    return this.schedulesService.remove(scheduleId, workspaceId);
  }
}
