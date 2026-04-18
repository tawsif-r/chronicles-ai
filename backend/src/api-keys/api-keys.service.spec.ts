import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './api-key.entity';
import { mockRepo } from '../test-utils/mock-repo';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let repo: ReturnType<typeof mockRepo>;

  const workspaceId = 'ws-uuid-1';
  const ENCRYPTION_SECRET = 'test-secret-key-32chars-minimum!!';

  beforeEach(async () => {
    repo = mockRepo();

    const module = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: getRepositoryToken(ApiKey), useValue: repo },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(ENCRYPTION_SECRET),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ApiKeysService);
  });

  // ── store ──────────────────────────────────────────────────────────────────

  describe('store()', () => {
    it('creates new key when none exists for provider', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((v) => v);
      repo.save.mockImplementation((v) => Promise.resolve({ id: 'key-id', ...v }));

      const result = await service.store(workspaceId, 'anthropic', 'sk-ant-secret');

      expect(repo.save).toHaveBeenCalled();
      // Stored key should be encrypted (not plaintext)
      const saved = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.encryptedKey).not.toBe('sk-ant-secret');
      expect(saved.encryptedKey).toContain(':'); // iv:tag:enc format
    });

    it('updates existing key (upsert) when provider already stored', async () => {
      const existing = { id: 'existing-id', provider: 'openai', encryptedKey: 'old' };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((v) => Promise.resolve(v));

      await service.store(workspaceId, 'openai', 'sk-new-key');

      const saved = (repo.save as jest.Mock).mock.calls[0][0];
      expect(saved.encryptedKey).not.toBe('old');
      expect(saved.encryptedKey).not.toBe('sk-new-key');
    });
  });

  // ── buildEnvForAgent ────────────────────────────────────────────────────────

  describe('buildEnvForAgent()', () => {
    it('returns empty object when no keys stored', async () => {
      repo.find.mockResolvedValue([]);
      const env = await service.buildEnvForAgent(workspaceId);
      expect(env).toEqual({});
    });

    it('decrypts keys and maps to env var names', async () => {
      // Store a real key so we can decrypt it back
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((v) => v);
      let savedKey: any;
      repo.save.mockImplementation((v) => {
        savedKey = { id: 'k1', ...v };
        return Promise.resolve(savedKey);
      });

      await service.store(workspaceId, 'anthropic', 'sk-ant-realkey');

      // Now mock find to return the saved encrypted key
      repo.find.mockResolvedValue([savedKey]);

      const env = await service.buildEnvForAgent(workspaceId);
      expect(env['ANTHROPIC_API_KEY']).toBe('sk-ant-realkey');
    });

    it('maps all three providers correctly', async () => {
      // Create encrypted versions of keys via store()
      const keys: any[] = [];
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((v) => v);
      repo.save.mockImplementation((v) => {
        const k = { id: `k-${v.provider}`, ...v };
        keys.push(k);
        return Promise.resolve(k);
      });

      await service.store(workspaceId, 'anthropic', 'ant-key');
      await service.store(workspaceId, 'openai', 'oai-key');
      await service.store(workspaceId, 'openrouter', 'or-key');

      repo.find.mockResolvedValue(keys);
      const env = await service.buildEnvForAgent(workspaceId);

      expect(env['ANTHROPIC_API_KEY']).toBe('ant-key');
      expect(env['OPENAI_API_KEY']).toBe('oai-key');
      expect(env['OPENROUTER_API_KEY']).toBe('or-key');
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('removes key when found', async () => {
      const key = { id: 'k1', provider: 'openai' };
      repo.findOne.mockResolvedValue(key);
      repo.remove.mockResolvedValue(undefined);

      await service.remove('k1', workspaceId);

      expect(repo.remove).toHaveBeenCalledWith(key);
    });

    it('throws NotFoundException when key not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('nonexistent', workspaceId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── encrypt/decrypt roundtrip ───────────────────────────────────────────────

  it('encrypt/decrypt roundtrip returns original value', async () => {
    // Use store + buildEnvForAgent as a proxy for the private methods
    const plaintext = 'super-secret-api-key-value-12345';

    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((v) => v);
    let savedKey: any;
    repo.save.mockImplementation((v) => {
      savedKey = { id: 'k1', ...v };
      return Promise.resolve(savedKey);
    });

    await service.store(workspaceId, 'anthropic', plaintext);
    expect(savedKey.encryptedKey).not.toBe(plaintext);

    repo.find.mockResolvedValue([savedKey]);
    const env = await service.buildEnvForAgent(workspaceId);
    expect(env['ANTHROPIC_API_KEY']).toBe(plaintext);
  });
});
