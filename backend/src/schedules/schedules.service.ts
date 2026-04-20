import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AgentSchedule } from './schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

export const SCHEDULES_QUEUE = 'agent-schedules';
export const SCHEDULE_JOB = 'run';

export interface ScheduleJobPayload {
  scheduleId: string;
  agentId: string;
  workspaceId: string;
  prompt: string;
}

@Injectable()
export class SchedulesService implements OnModuleInit {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(AgentSchedule)
    private readonly repo: Repository<AgentSchedule>,
    @InjectQueue(SCHEDULES_QUEUE)
    private readonly queue: Queue<ScheduleJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = await this.repo.find({ where: { enabled: true } });
    for (const schedule of enabled) {
      await this.registerJob(schedule).catch((err) =>
        this.logger.warn(`Failed to register schedule ${schedule.id}: ${err.message}`),
      );
    }
    this.logger.log(`Registered ${enabled.length} scheduled agent job(s)`);
  }

  async findAll(agentId: string, workspaceId: string): Promise<AgentSchedule[]> {
    return this.repo.find({ where: { agentId, workspaceId } });
  }

  async findOne(scheduleId: string, workspaceId: string): Promise<AgentSchedule> {
    const schedule = await this.repo.findOne({ where: { id: scheduleId, workspaceId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async create(agentId: string, workspaceId: string, dto: CreateScheduleDto): Promise<AgentSchedule> {
    const schedule = await this.repo.save(
      this.repo.create({
        agentId,
        workspaceId,
        agent: { id: agentId },
        cronExpression: dto.cronExpression,
        prompt: dto.prompt,
        enabled: true,
        lastRunAt: null,
      }),
    );
    await this.registerJob(schedule);
    return schedule;
  }

  async update(scheduleId: string, workspaceId: string, dto: UpdateScheduleDto): Promise<AgentSchedule> {
    const existing = await this.findOne(scheduleId, workspaceId);
    await this.unregisterJob(existing.id, existing.cronExpression);
    await this.repo.update(scheduleId, { ...dto });
    const updated = await this.findOne(scheduleId, workspaceId);
    if (updated.enabled) await this.registerJob(updated);
    return updated;
  }

  async remove(scheduleId: string, workspaceId: string): Promise<void> {
    const existing = await this.findOne(scheduleId, workspaceId);
    await this.unregisterJob(existing.id, existing.cronExpression);
    await this.repo.delete(scheduleId);
  }

  async markRan(scheduleId: string): Promise<void> {
    await this.repo.update(scheduleId, { lastRunAt: new Date() });
  }

  private async registerJob(schedule: AgentSchedule): Promise<void> {
    const payload: ScheduleJobPayload = {
      scheduleId: schedule.id,
      agentId: schedule.agentId,
      workspaceId: schedule.workspaceId,
      prompt: schedule.prompt,
    };
    await this.queue.add(SCHEDULE_JOB, payload, {
      repeat: { cron: schedule.cronExpression },
      jobId: `sched-${schedule.id}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Registered schedule ${schedule.id} with cron "${schedule.cronExpression}"`);
  }

  private async unregisterJob(scheduleId: string, cronExpression: string): Promise<void> {
    try {
      await this.queue.removeRepeatable(SCHEDULE_JOB, {
        cron: cronExpression,
        jobId: `sched-${scheduleId}`,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to unregister schedule ${scheduleId}: ${err.message}`);
    }
  }
}
