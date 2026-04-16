import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ModelProvider } from '@chronicles/shared';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmChatParams {
  provider: ModelProvider;
  model: string;
  systemPrompt: string;
  messages: LlmMessage[];
  /** Decrypted API keys keyed by env var name (from ApiKeysService.buildEnvForAgent) */
  apiKeys: Record<string, string>;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async chat(params: LlmChatParams): Promise<string> {
    const { provider, model, systemPrompt, messages, apiKeys } = params;

    this.logger.log(`LLM call: provider=${provider} model=${model} msgs=${messages.length}`);

    try {
      if (provider === 'claude') {
        return await this.callAnthropic(model, systemPrompt, messages, apiKeys['ANTHROPIC_API_KEY']);
      }
      if (provider === 'openai') {
        return await this.callOpenAICompat(model, systemPrompt, messages, {
          apiKey: apiKeys['OPENAI_API_KEY'],
        });
      }
      if (provider === 'openrouter') {
        return await this.callOpenAICompat(model, systemPrompt, messages, {
          apiKey: apiKeys['OPENROUTER_API_KEY'],
          baseURL: 'https://openrouter.ai/api/v1',
        });
      }
      if (provider === 'ollama') {
        return await this.callOpenAICompat(model, systemPrompt, messages, {
          apiKey: 'ollama',
          baseURL: 'http://localhost:11434/v1',
        });
      }
      throw new Error(`Unsupported provider: ${provider}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`LLM error [${provider}/${model}]: ${msg}`);
      throw new InternalServerErrorException(`LLM error: ${msg}`);
    }
  }

  private async callAnthropic(
    model: string,
    systemPrompt: string,
    messages: LlmMessage[],
    apiKey: string | undefined,
  ): Promise<string> {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set — add it in Settings');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages,
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  private async callOpenAICompat(
    model: string,
    systemPrompt: string,
    messages: LlmMessage[],
    opts: { apiKey?: string; baseURL?: string },
  ): Promise<string> {
    if (!opts.apiKey || opts.apiKey === 'ollama' === false && !opts.apiKey) {
      throw new Error(`API key not set for this provider — add it in Settings`);
    }
    const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
    const response = await client.chat.completions.create({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages,
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
