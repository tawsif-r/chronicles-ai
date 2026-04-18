import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { LlmService, LlmChatParams } from './llm.service';

// ── Mock SDKs at module level ────────────────────────────────────────────────

const mockAnthropicCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

const mockOpenAICreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const baseParams = (overrides?: Partial<LlmChatParams>): LlmChatParams => ({
  provider: 'claude',
  model: 'claude-haiku-4-5',
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: 'Hello' }],
  apiKeys: { ANTHROPIC_API_KEY: 'sk-ant-test' },
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LlmService', () => {
  let service: LlmService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [LlmService],
    }).compile();
    service = module.get(LlmService);
    jest.clearAllMocks();
  });

  // ── Claude ─────────────────────────────────────────────────────────────────

  describe('provider: claude', () => {
    it('calls Anthropic SDK and returns text reply', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from Claude!' }],
      });

      const result = await service.chat(baseParams());

      expect(result).toBe('Hello from Claude!');
      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5' }),
      );
    });

    it('returns empty string when content block is not text', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'xyz' }],
      });

      const result = await service.chat(baseParams());
      expect(result).toBe('');
    });

    it('throws InternalServerErrorException when ANTHROPIC_API_KEY missing', async () => {
      await expect(
        service.chat(baseParams({ apiKeys: {} })),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── OpenAI ─────────────────────────────────────────────────────────────────

  describe('provider: openai', () => {
    it('calls OpenAI SDK and returns reply', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello from OpenAI!' } }],
      });

      const result = await service.chat(
        baseParams({ provider: 'openai', apiKeys: { OPENAI_API_KEY: 'sk-openai-test' } }),
      );

      expect(result).toBe('Hello from OpenAI!');
      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it('throws when OPENAI_API_KEY missing', async () => {
      await expect(
        service.chat(baseParams({ provider: 'openai', apiKeys: {} })),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── OpenRouter ──────────────────────────────────────────────────────────────

  describe('provider: openrouter', () => {
    it('calls OpenAI SDK with openrouter baseURL', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'OpenRouter reply' } }],
      });

      const OpenAI = require('openai').default;
      const result = await service.chat(
        baseParams({
          provider: 'openrouter',
          apiKeys: { OPENROUTER_API_KEY: 'sk-or-test' },
        }),
      );

      expect(result).toBe('OpenRouter reply');
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'https://openrouter.ai/api/v1' }),
      );
    });

    it('throws when OPENROUTER_API_KEY missing', async () => {
      await expect(
        service.chat(baseParams({ provider: 'openrouter', apiKeys: {} })),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── Ollama ──────────────────────────────────────────────────────────────────

  describe('provider: ollama', () => {
    it('calls OpenAI SDK with localhost baseURL, no API key required', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Ollama reply' } }],
      });

      const OpenAI = require('openai').default;
      const result = await service.chat(
        baseParams({ provider: 'ollama', apiKeys: {} }),
      );

      expect(result).toBe('Ollama reply');
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'http://localhost:11434/v1' }),
      );
    });
  });

  // ── Unknown provider ────────────────────────────────────────────────────────

  it('throws InternalServerErrorException for unsupported provider', async () => {
    await expect(
      service.chat(baseParams({ provider: 'unknown' as any })),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
