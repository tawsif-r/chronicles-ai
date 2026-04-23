import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DocumentsService, DOCUMENT_QUEUE, EMBED_JOB, EmbedJobPayload } from './documents.service';

@Processor(DOCUMENT_QUEUE)
export class DocumentProcessor {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(private readonly documentsService: DocumentsService) {}

  @Process(EMBED_JOB)
  async handleEmbedding(job: Job<EmbedJobPayload>): Promise<void> {
    const { documentId, workspaceId } = job.data;
    this.logger.log(`Processing document ${documentId}`);
    await this.documentsService.processDocument(documentId, workspaceId);
  }
}
