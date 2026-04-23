import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { GmailService } from '../gmail/gmail.service';
import { DocumentsService } from '../documents/documents.service';

export interface ToolExecutionContext {
  agentId: string;
  workspaceId: string;
}

const PRIVATE_IP_RE =
  /localhost|127\.0\.0\.1|0\.0\.0\.0|169\.254|^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./;

@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
    private readonly workspacesService: WorkspacesService,
    private readonly gmailService: GmailService,
    private readonly documentsService: DocumentsService,
  ) {}

  async execute(
    toolName: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<string> {
    this.logger.log(`tool=${toolName} agent=${ctx.agentId}`);
    try {
      switch (toolName) {
        case 'http_request':
          return await this.httpRequest(input);
        case 'read_memory':
          return await this.readMemory(ctx);
        case 'write_memory':
          return await this.writeMemory(input, ctx);
        case 'read_emails':
          return await this.readEmails(input, ctx);
        case 'search_documents':
          return await this.searchDocuments(input, ctx);
        default:
          return `Error: unknown tool "${toolName}"`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`tool=${toolName} error: ${msg}`);
      return `Error executing ${toolName}: ${msg}`;
    }
  }

  private async httpRequest(input: Record<string, unknown>): Promise<string> {
    const url = String(input.url ?? '');
    if (!url) return 'Error: url is required';

    // Block private network access
    const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
    if (PRIVATE_IP_RE.test(hostname)) {
      return 'Error: requests to private/local addresses are not allowed';
    }

    const method = (String(input.method ?? 'GET')).toUpperCase();
    const body = input.body != null ? String(input.body) : undefined;
    const headers: Record<string, string> = {
      'User-Agent': 'ChroniclesAI-Agent/1.0',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    };

    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text();
    const truncated = text.length > 4000 ? text.slice(0, 4000) + '\n...[truncated]' : text;
    return `HTTP ${res.status}\n${truncated}`;
  }

  private async readMemory(ctx: ToolExecutionContext): Promise<string> {
    const agent = await this.agentsService.findOne(ctx.agentId, ctx.workspaceId);
    const workspace = await this.workspacesService.findById(ctx.workspaceId);
    if (!workspace) return 'Error: workspace not found';
    const content = await this.agentsService.getMemory(agent, workspace);
    return content || '(memory is empty)';
  }

  private async readEmails(input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
    const maxResults = typeof input.maxResults === 'number' ? input.maxResults : 10;
    const query = typeof input.query === 'string' ? input.query : '';
    return this.gmailService.listEmails(ctx.workspaceId, { maxResults, query });
  }

  private async searchDocuments(input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
    const query = String(input.query ?? '').trim();
    if (!query) return 'Error: query is required';
    const limit = Math.min(typeof input.limit === 'number' ? input.limit : 5, 20);
    const documentIds = Array.isArray(input.documentIds)
      ? (input.documentIds as string[])
      : undefined;

    const results = await this.documentsService.search(ctx.workspaceId, query, limit, documentIds);
    if (results.length === 0) {
      return 'No relevant documents found. Make sure documents are uploaded and processed (status: ready).';
    }
    return results
      .map(
        (r, i) =>
          `[${i + 1}] "${r.title ?? r.filename}" (similarity: ${r.similarity.toFixed(3)})\n${r.content}`,
      )
      .join('\n\n---\n\n');
  }

  private async writeMemory(input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
    const content = String(input.content ?? '');
    const agent = await this.agentsService.findOne(ctx.agentId, ctx.workspaceId);
    const workspace = await this.workspacesService.findById(ctx.workspaceId);
    if (!workspace) return 'Error: workspace not found';
    await this.agentsService.setMemory(agent, workspace, content);
    return 'Memory updated successfully';
  }
}
