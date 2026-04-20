import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { Agent } from './agent.entity';
import { AgentChannel } from './agent-channel.entity';
import { mockRepo } from '../test-utils/mock-repo';
import { DiscordService } from '../discord/discord.service';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentRepo: ReturnType<typeof mockRepo>;
  let channelRepo: ReturnType<typeof mockRepo>;

  const workspaceId = 'ws-1';
  const agentId = 'ag-1';

  const makeAgent = (overrides = {}): Agent =>
    ({
      id: agentId,
      name: 'Test Agent',
      status: 'stopped',
      modelProvider: 'claude',
      modelName: 'claude-haiku-4-5',
      gatewayPort: null,
      soulMd: '',
      toolsMd: '',
      identityMd: '',
      heartbeatMd: '',
      channels: [],
      workspace: { id: workspaceId },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as Agent);

  beforeEach(async () => {
    agentRepo = mockRepo();
    channelRepo = mockRepo();

    const mockDiscordService = {
      init: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        AgentsService,
        { provide: getRepositoryToken(Agent), useValue: agentRepo },
        { provide: getRepositoryToken(AgentChannel), useValue: channelRepo },
        { provide: DiscordService, useValue: mockDiscordService },
      ],
    }).compile();

    service = module.get(AgentsService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns agents for workspace', async () => {
      const agents = [makeAgent()];
      agentRepo.find.mockResolvedValue(agents);

      const result = await service.findAll(workspaceId);

      expect(agentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspace: { id: workspaceId } } }),
      );
      expect(result).toEqual(agents);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns agent when found', async () => {
      const agent = makeAgent();
      agentRepo.findOne.mockResolvedValue(agent);

      const result = await service.findOne(agentId, workspaceId);
      expect(result).toEqual(agent);
    });

    it('throws NotFoundException when agent not found', async () => {
      agentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('no-exist', workspaceId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates and saves agent', async () => {
      const dto = { name: 'New Agent', modelProvider: 'claude' as const, modelName: 'claude-haiku-4-5' };
      const workspace = { id: workspaceId } as any;
      const created = makeAgent({ ...dto, workspace });

      agentRepo.create.mockReturnValue(created);
      agentRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, workspace);

      expect(agentRepo.create).toHaveBeenCalled();
      expect(agentRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('applies dto and saves', async () => {
      const agent = makeAgent();
      agentRepo.findOne.mockResolvedValue(agent);
      agentRepo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.update(agentId, workspaceId, { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
      expect(agentRepo.save).toHaveBeenCalled();
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('removes agent', async () => {
      const agent = makeAgent();
      agentRepo.findOne.mockResolvedValue(agent);
      agentRepo.remove.mockResolvedValue(undefined);

      await service.remove(agentId, workspaceId);
      expect(agentRepo.remove).toHaveBeenCalledWith(agent);
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('updates status in repo', async () => {
      agentRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(agentId, workspaceId, 'running');

      expect(agentRepo.update).toHaveBeenCalledWith(
        { id: agentId, workspace: { id: workspaceId } },
        expect.objectContaining({ status: 'running' }),
      );
    });
  });

  // ── addChannel ─────────────────────────────────────────────────────────────

  describe('addChannel()', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('checks ownership then saves channel', async () => {
      const agent = makeAgent();
      agentRepo.findOne.mockResolvedValue(agent);

      const channel = { id: 'ch-1', agent, channelType: 'slack', config: {}, enabled: true } as any;
      channelRepo.create.mockReturnValue(channel);
      channelRepo.save.mockResolvedValue(channel);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      const dto = { channelType: 'slack' as const, config: { botToken: 'xoxb-test' } };
      const result = await service.addChannel(agentId, workspaceId, dto);

      expect(agentRepo.findOne).toHaveBeenCalled(); // ownership check
      expect(channelRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ channelType: 'slack', agent }),
      );
      expect(result).toEqual(channel);
    });

    it('throws NotFoundException when agent not owned by workspace', async () => {
      agentRepo.findOne.mockResolvedValue(null);
      const dto = { channelType: 'slack' as const, config: {} };
      await expect(service.addChannel(agentId, 'wrong-ws', dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeChannel ──────────────────────────────────────────────────────────

  describe('removeChannel()', () => {
    it('checks ownership then deletes channel', async () => {
      const agent = makeAgent();
      agentRepo.findOne.mockResolvedValue(agent);
      channelRepo.delete.mockResolvedValue({ affected: 1 });

      await service.removeChannel(agentId, workspaceId, 'ch-1');

      expect(agentRepo.findOne).toHaveBeenCalled(); // ownership check
      expect(channelRepo.delete).toHaveBeenCalledWith({ id: 'ch-1', agent: { id: agentId } });
    });
  });
});
