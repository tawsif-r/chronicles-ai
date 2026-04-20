import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { AgentsService } from '../agents/agents.service';
import { LogsService } from '../logs/logs.service';

describe('RuntimeService', () => {
  let service: RuntimeService;
  let agentsService: jest.Mocked<AgentsService>;
  let logsService: jest.Mocked<LogsService>;

  const agentId = 'ag-1';
  const workspaceId = 'ws-1';
  const agent = { id: agentId, workspace: { id: workspaceId } } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RuntimeService,
        {
          provide: AgentsService,
          useValue: {
            assertOwnership: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: LogsService,
          useValue: {
            ingest: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(RuntimeService);
    agentsService = module.get(AgentsService) as jest.Mocked<AgentsService>;
    logsService = module.get(LogsService) as jest.Mocked<LogsService>;
  });

  // ── start ──────────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('asserts ownership then sets status to running', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);

      await service.start(agentId, workspaceId);

      expect(agentsService.assertOwnership).toHaveBeenCalledWith(agentId, workspaceId);
      expect(agentsService.updateStatus).toHaveBeenCalledWith(agentId, workspaceId, 'running', null);
    });

    it('emits "Agent started" log', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);

      await service.start(agentId, workspaceId);

      expect(logsService.ingest).toHaveBeenCalledWith(agentId, 'info', 'Agent started');
    });

    it('still starts when ingest throws', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);
      logsService.ingest.mockRejectedValue(new Error('DB down'));

      await expect(service.start(agentId, workspaceId)).resolves.toBeUndefined();
      expect(agentsService.updateStatus).toHaveBeenCalledWith(agentId, workspaceId, 'running', null);
    });

    it('propagates NotFoundException from assertOwnership', async () => {
      agentsService.assertOwnership.mockRejectedValue(new NotFoundException());

      await expect(service.start('bad-id', workspaceId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── stop ───────────────────────────────────────────────────────────────────

  describe('stop()', () => {
    it('asserts ownership then sets status to stopped', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);

      await service.stop(agentId, workspaceId);

      expect(agentsService.updateStatus).toHaveBeenCalledWith(agentId, workspaceId, 'stopped', null);
    });

    it('emits "Agent stopped" log', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);

      await service.stop(agentId, workspaceId);

      expect(logsService.ingest).toHaveBeenCalledWith(agentId, 'info', 'Agent stopped');
    });

    it('does not throw when agent not found (swallows exception)', async () => {
      agentsService.assertOwnership.mockRejectedValue(new NotFoundException());

      await expect(service.stop('bad-id', workspaceId)).resolves.toBeUndefined();
    });
  });

  // ── restart ────────────────────────────────────────────────────────────────

  describe('restart()', () => {
    it('calls stop then start', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);

      await service.restart(agentId, workspaceId);

      expect(agentsService.updateStatus).toHaveBeenCalledTimes(2);
      const calls = agentsService.updateStatus.mock.calls;
      expect(calls[0][2]).toBe('stopped');
      expect(calls[1][2]).toBe('running');
    });

    it('emits "Agent restarted" log', async () => {
      agentsService.assertOwnership.mockResolvedValue(agent);
      agentsService.updateStatus.mockResolvedValue(undefined);

      await service.restart(agentId, workspaceId);

      expect(logsService.ingest).toHaveBeenCalledWith(agentId, 'info', 'Agent restarted');
    });
  });
});
