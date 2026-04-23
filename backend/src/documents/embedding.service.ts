import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ApiKeysService } from '../api-keys/api-keys.service';

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;
const BATCH_SIZE = 100;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async embed(texts: string[], workspaceId: string): Promise<number[][]> {
    const env = await this.apiKeysService.buildEnvForAgent(workspaceId);
    const apiKey = env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OpenAI API key required for document embeddings. Add it in Settings.');
    }

    const client = new OpenAI({ apiKey });
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const resp = await this.withRetry(() =>
        client.embeddings.create({ model: EMBED_MODEL, input: batch, dimensions: EMBED_DIMS }),
      );
      results.push(...resp.data.map((d) => d.embedding));
      this.logger.log(`Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`);
    }

    return results;
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === attempts) throw err;
        const delay = 1000 * Math.pow(2, attempt - 1);
        this.logger.warn(`Embed attempt ${attempt} failed, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('unreachable');
  }
}
