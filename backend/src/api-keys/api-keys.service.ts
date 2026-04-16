import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from './api-key.entity';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class ApiKeysService {
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly cfg: ConfigService,
  ) {
    const secret = cfg.getOrThrow<string>('API_KEY_ENCRYPTION_SECRET');
    // Derive a 32-byte key from the secret
    this.encryptionKey = crypto.scryptSync(secret, 'chronicles-salt', 32);
  }

  async store(
    workspaceId: string,
    provider: string,
    plaintext: string,
  ): Promise<ApiKey> {
    // Upsert: one key per provider per workspace
    const existing = await this.repo.findOne({
      where: { workspace: { id: workspaceId }, provider },
    });

    const encryptedKey = this.encrypt(plaintext);
    if (existing) {
      existing.encryptedKey = encryptedKey;
      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({
        workspace: { id: workspaceId },
        provider,
        encryptedKey,
      }),
    );
  }

  async listForWorkspace(workspaceId: string): Promise<Omit<ApiKey, 'encryptedKey'>[]> {
    const keys = await this.repo.find({
      where: { workspace: { id: workspaceId } },
    });
    return keys.map(({ encryptedKey: _k, ...safe }) => safe);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const key = await this.repo.findOne({
      where: { id, workspace: { id: workspaceId } },
    });
    if (!key) throw new NotFoundException('API key not found');
    await this.repo.remove(key);
  }

  /** Returns env vars to inject into an agent process at start time. */
  async buildEnvForAgent(workspaceId: string): Promise<Record<string, string>> {
    const keys = await this.repo.find({
      where: { workspace: { id: workspaceId } },
    });

    const env: Record<string, string> = {};
    for (const k of keys) {
      const plain = this.decrypt(k.encryptedKey);
      if (k.provider === 'anthropic') env['ANTHROPIC_API_KEY'] = plain;
      if (k.provider === 'openai') env['OPENAI_API_KEY'] = plain;
      if (k.provider === 'openrouter') env['OPENROUTER_API_KEY'] = plain;
    }
    return env;
  }

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  private decrypt(stored: string): string {
    const [ivHex, tagHex, encHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString('utf8') + decipher.final('utf8');
  }
}
