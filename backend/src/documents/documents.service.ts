import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository, DataSource } from 'typeorm';
import { Queue } from 'bull';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Document } from './document.entity';
import { DocumentChunk } from './document-chunk.entity';
import { EmbeddingService } from './embedding.service';

export const DOCUMENT_QUEUE = 'document-embedding';
export const EMBED_JOB = 'embed-document';

export interface EmbedJobPayload {
  documentId: string;
  workspaceId: string;
}

export interface SearchResult {
  documentId: string;
  filename: string;
  title: string | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

interface ChunkItem {
  text: string;
  start: number;
}

@Injectable()
export class DocumentsService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    @InjectQueue(DOCUMENT_QUEUE)
    private readonly embedQueue: Queue<EmbedJobPayload>,
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Convert embedding column from text → vector(1536) after TypeORM synchronize
    try {
      await this.dataSource.query(`
        ALTER TABLE document_chunks
          ALTER COLUMN embedding TYPE vector(1536)
          USING embedding::vector(1536)
      `);
      this.logger.log('document_chunks.embedding column converted to vector(1536)');
    } catch {
      // Already vector type or table doesn't exist yet — both OK
    }

    // HNSW index (works with any corpus size, unlike ivfflat which needs 1000+ rows)
    try {
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
          ON document_chunks
          USING hnsw (embedding vector_cosine_ops)
      `);
    } catch {
      // Index may already exist
    }
  }

  async upload(
    workspaceId: string,
    file: Express.Multer.File,
    basePath: string,
  ): Promise<Document> {
    const docId = randomUUID();
    const finalDir = path.join(basePath, 'documents', workspaceId, docId);
    await fs.mkdir(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, file.originalname);
    await fs.rename(file.path, finalPath);

    // Extract PDF title from metadata if available
    let title: string | null = null;

    const doc = this.docRepo.create({
      id: docId,
      workspace: { id: workspaceId },
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      status: 'pending',
      diskPath: finalPath,
      title,
    });
    await this.docRepo.save(doc);

    await this.embedQueue.add(
      EMBED_JOB,
      { documentId: docId, workspaceId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return doc;
  }

  async processDocument(documentId: string, workspaceId: string): Promise<void> {
    const doc = await this.docRepo.findOne({
      where: { id: documentId, workspace: { id: workspaceId } },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    await this.docRepo.update(documentId, { status: 'processing' });

    try {
      const buffer = await fs.readFile(doc.diskPath);
      const text = await this.parseFile(buffer, doc.mimeType, doc.filename);

      // Try to extract title from PDF metadata
      if (doc.mimeType === 'application/pdf') {
        try {
          const { PDFParse } = await import('pdf-parse');
          const parser = new PDFParse({ data: buffer });
          const info = await parser.getInfo();
          const pdfTitle = (info as unknown as Record<string, unknown>)?.Title;
          if (pdfTitle && typeof pdfTitle === 'string') {
            await this.docRepo.update(documentId, { title: pdfTitle });
          }
        } catch { /* ignore metadata extraction errors */ }
      }

      if (!text.trim()) {
        await this.docRepo.update(documentId, {
          status: 'ready',
          chunkCount: 0,
          errorMessage: 'No extractable text found in this file.',
        });
        return;
      }

      const chunks = this.chunkText(text);
      const embeddings = await this.embeddingService.embed(
        chunks.map((c) => c.text),
        workspaceId,
      );

      const chunkEntities = chunks.map((c, i) =>
        this.chunkRepo.create({
          document: { id: documentId },
          chunkIndex: i,
          content: c.text,
          embedding: embeddings[i],
          charStart: c.start,
          charEnd: c.start + c.text.length,
        }),
      );

      await this.chunkRepo.save(chunkEntities);
      await this.docRepo.update(documentId, { status: 'ready', chunkCount: chunks.length });
      this.logger.log(`Document ${documentId} processed: ${chunks.length} chunks`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Document ${documentId} processing failed: ${msg}`);
      await this.docRepo.update(documentId, { status: 'error', errorMessage: msg });
      throw err;
    }
  }

  async list(workspaceId: string, status?: string): Promise<Document[]> {
    const where: Record<string, unknown> = { workspace: { id: workspaceId } };
    if (status) where['status'] = status;
    return this.docRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, workspaceId: string): Promise<Document> {
    const doc = await this.docRepo.findOne({
      where: { id, workspace: { id: workspaceId } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const doc = await this.findOne(id, workspaceId);
    const diskPath = doc.diskPath;
    await this.docRepo.remove(doc);
    // Clean up disk — remove the document's directory
    try {
      await fs.rm(path.dirname(diskPath), { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(`Failed to remove files for document ${id}: ${err}`);
    }
  }

  async search(
    workspaceId: string,
    query: string,
    limit = 5,
    documentIds?: string[],
  ): Promise<SearchResult[]> {
    const [queryEmbedding] = await this.embeddingService.embed([query], workspaceId);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    let sql = `
      SELECT
        dc.id,
        dc.content,
        dc."chunkIndex",
        dc."charStart",
        dc."charEnd",
        d.id AS "documentId",
        d.filename,
        d.title,
        1 - (dc.embedding <=> $1::vector) AS similarity
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."workspaceId" = $2
        AND dc.embedding IS NOT NULL
        AND d.status = 'ready'
    `;
    const params: unknown[] = [embeddingStr, workspaceId];

    if (documentIds?.length) {
      params.push(documentIds);
      sql += ` AND d.id = ANY($${params.length})`;
    }

    params.push(limit);
    sql += ` ORDER BY dc.embedding <=> $1::vector LIMIT $${params.length}`;

    const rows = await this.dataSource.query(sql, params);
    return rows.map(
      (r: Record<string, unknown>) =>
        ({
          documentId: r['documentId'] as string,
          filename: r['filename'] as string,
          title: (r['title'] as string | null) ?? null,
          chunkIndex: r['chunkIndex'] as number,
          content: r['content'] as string,
          similarity: parseFloat(r['similarity'] as string),
        }) satisfies SearchResult,
    );
  }

  private async parseFile(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const lowerMime = mimeType.toLowerCase();
    const lowerName = filename.toLowerCase();

    if (lowerMime === 'application/pdf') {
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.text;
      } catch (err) {
        this.logger.warn(`PDF parse failed: ${err}`);
        return '';
      }
    }

    if (
      lowerMime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerName.endsWith('.docx')
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (
      lowerMime === 'text/plain' ||
      lowerMime === 'text/markdown' ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.txt')
    ) {
      return buffer.toString('utf-8');
    }

    // Images: no text extraction in v1
    return '';
  }

  private chunkText(text: string, chunkSize = 2000, overlap = 200): ChunkItem[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: ChunkItem[] = [];
    let current = '';
    let currentStart = 0;
    let cursor = 0;

    for (const para of paragraphs) {
      const paraWithSep = current.length > 0 ? '\n\n' + para : para;

      if (current.length + paraWithSep.length <= chunkSize) {
        current += paraWithSep;
        cursor += para.length + (current.length > para.length ? 2 : 0);
      } else {
        if (current) {
          chunks.push({ text: current, start: currentStart });
          const overlapText = current.slice(-overlap);
          currentStart = currentStart + current.length - overlapText.length;
          current = overlapText + '\n\n' + para;
        } else {
          // Single paragraph larger than chunkSize — hard split
          let remaining = para;
          let remStart = cursor;
          while (remaining.length > chunkSize) {
            chunks.push({ text: remaining.slice(0, chunkSize), start: remStart });
            remStart += chunkSize - overlap;
            remaining = remaining.slice(chunkSize - overlap);
          }
          current = remaining;
          currentStart = remStart;
        }
        cursor += para.length;
      }
    }

    if (current.trim()) {
      chunks.push({ text: current, start: currentStart });
    }

    return chunks;
  }
}
