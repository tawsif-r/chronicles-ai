import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import * as crypto from 'crypto';
import { GmailIntegration } from './gmail-integration.entity';

const ALGORITHM = 'aes-256-gcm';
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private readonly encryptionKey: Buffer;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    @InjectRepository(GmailIntegration)
    private readonly repo: Repository<GmailIntegration>,
    private readonly cfg: ConfigService,
  ) {
    const secret = cfg.getOrThrow<string>('API_KEY_ENCRYPTION_SECRET');
    this.encryptionKey = crypto.scryptSync(secret, 'chronicles-salt', 32);
    this.clientId = cfg.get<string>('GOOGLE_CLIENT_ID') ?? '';
    this.clientSecret = cfg.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    this.redirectUri = cfg.get<string>('GOOGLE_REDIRECT_URI') ?? '';
  }

  private assertConfigured() {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Gmail OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env');
    }
  }

  private makeOAuth2Client() {
    this.assertConfigured();
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  getAuthUrl(workspaceId: string): string {
    const client = this.makeOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      state: Buffer.from(workspaceId).toString('base64'),
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const workspaceId = Buffer.from(state, 'base64').toString('utf8');
    const client = this.makeOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new UnauthorizedException('Missing tokens from Google');
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();

    const existing = await this.repo.findOne({ where: { workspaceId } });
    const record = existing ?? this.repo.create({ workspaceId });

    record.encryptedAccessToken = this.encrypt(tokens.access_token);
    record.encryptedRefreshToken = this.encrypt(tokens.refresh_token);
    record.email = data.email ?? '';
    record.expiresAt = tokens.expiry_date ?? Date.now() + 3600_000;

    await this.repo.save(record);
    this.logger.log(`Gmail connected for workspace=${workspaceId} email=${record.email}`);
  }

  async getStatus(workspaceId: string): Promise<{ connected: boolean; email?: string }> {
    const record = await this.repo.findOne({ where: { workspaceId } });
    if (!record) return { connected: false };
    return { connected: true, email: record.email };
  }

  async disconnect(workspaceId: string): Promise<void> {
    const record = await this.repo.findOne({ where: { workspaceId } });
    if (!record) throw new NotFoundException('Gmail not connected');
    await this.repo.remove(record);
  }

  async listEmails(
    workspaceId: string,
    opts: { maxResults?: number; query?: string },
  ): Promise<string> {
    const record = await this.repo.findOne({ where: { workspaceId } });
    if (!record) return 'Error: Gmail not connected for this workspace. Connect Gmail in workspace settings first.';

    const client = this.makeOAuth2Client();
    client.setCredentials({
      access_token: this.decrypt(record.encryptedAccessToken),
      refresh_token: this.decrypt(record.encryptedRefreshToken),
      expiry_date: Number(record.expiresAt),
    });

    // Auto-refresh and persist new token
    client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        record.encryptedAccessToken = this.encrypt(tokens.access_token);
        if (tokens.expiry_date) record.expiresAt = tokens.expiry_date;
        await this.repo.save(record);
      }
    });

    const gmail = google.gmail({ version: 'v1', auth: client });
    const maxResults = Math.min(opts.maxResults ?? 10, 25);
    const q = opts.query ?? '';

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: q || undefined,
    });

    const messages = listRes.data.messages ?? [];
    if (messages.length === 0) return 'No emails found matching the query.';

    const parts: string[] = [];
    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = full.data.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? '';

      const snippet = full.data.snippet ?? '';
      const truncated = snippet.length > 300 ? snippet.slice(0, 300) + '...' : snippet;

      parts.push(
        `---\nFrom: ${get('From')}\nSubject: ${get('Subject')}\nDate: ${get('Date')}\n${truncated}`,
      );
    }

    return parts.join('\n\n');
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
