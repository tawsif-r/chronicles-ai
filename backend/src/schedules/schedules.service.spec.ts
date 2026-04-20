import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { SchedulesService, SCHEDULES_QUEUE } from './schedules.service';
import { AgentSchedule } from './schedule.entity';
import { mockRepo } from '../test-utils/mock-repo';

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
  removeRepeatable: jest.fn().mockResolvedValue(undefined),
  find: jest.fn().mockResolvedValue([]),
};

describe('SchedulesService', () => {
  let service: SchedulesService;
  let repo: ReturnType<typeof mockRepo>;

  const agentId = 'ag-1';
  const workspaceId = 'ws-1';
  const scheduleId = 'sched-1';

  const schedule: AgentSchedule = {
    id: scheduleId,
    agentId,
    workspaceId,
    cronExpression: '0 9 * * *',
    prompt: 'Daily summary',
    enabled: true,
    lastRunAt: null,
    createdAt: new Date(),
    agent: { id: agentId } as any,
  };

  beforeEach(async () => {
    repo = mockRepo();
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: getRepositoryToken(AgentSchedule), useValue: repo },
        { provide: getQueueToken(SCHEDULES_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(SchedulesService);
  });

  describe('onModuleInit()', () => {
    it('registers all enabled schedules as Bull jobs', async () => {
      repo.find.mockResolvedValue([schedule]);

      await service.onModuleInit();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'run',
        expect.objectContaining({ scheduleId, agentId, workspaceId }),
        expect.objectContaining({ repeat: { cron: '0 9 * * *' }, jobId: `sched-${scheduleId}` }),
      );
    });
  });

  describe('create()', () => {
    it('saves to DB and registers Bull repeatable job', async () => {
      repo.create.mockReturnValue(schedule);
      repo.save.mockResolvedValue(schedule);

      const result = await service.create(agentId, workspaceId, {
        cronExpression: '0 9 * * *',
        prompt: 'Daily summary',
      });

      expect(repo.save).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'run',
        expect.objectContaining({ agentId, workspaceId, prompt: 'Daily summary' }),
        expect.objectContaining({ repeat: { cron: '0 9 * * *' } }),
      );
      expect(result).toEqual(schedule);
    });
  });

  describe('remove()', () => {
    it('unregisters Bull job and deletes from DB', async () => {
      repo.findOne.mockResolvedValue(schedule);
      repo.delete.mockResolvedValue(undefined);

      await service.remove(scheduleId, workspaceId);

      expect(mockQueue.removeRepeatable).toHaveBeenCalledWith('run', {
        cron: '0 9 * * *',
        jobId: `sched-${scheduleId}`,
      });
      expect(repo.delete).toHaveBeenCalledWith(scheduleId);
    });

    it('throws NotFoundException when schedule not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('bad-id', workspaceId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('with enabled:false removes job without re-adding', async () => {
      repo.findOne.mockResolvedValue(schedule);
      repo.update.mockResolvedValue(undefined);

      const disabled = { ...schedule, enabled: false };
      repo.findOne
        .mockResolvedValueOnce(schedule)   // first findOne (existing)
        .mockResolvedValueOnce(disabled);  // second findOne (updated)

      await service.update(scheduleId, workspaceId, { enabled: false });

      expect(mockQueue.removeRepeatable).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('with new cron re-registers with updated expression', async () => {
      repo.findOne.mockResolvedValue(schedule);
      repo.update.mockResolvedValue(undefined);

      const updated = { ...schedule, cronExpression: '0 10 * * *' };
      repo.findOne
        .mockResolvedValueOnce(schedule)
        .mockResolvedValueOnce(updated);

      await service.update(scheduleId, workspaceId, { cronExpression: '0 10 * * *' });

      expect(mockQueue.removeRepeatable).toHaveBeenCalledWith('run', {
        cron: '0 9 * * *',
        jobId: `sched-${scheduleId}`,
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'run',
        expect.anything(),
        expect.objectContaining({ repeat: { cron: '0 10 * * *' } }),
      );
    });
  });
});
