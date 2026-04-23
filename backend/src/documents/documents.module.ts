import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Document } from './document.entity';
import { DocumentChunk } from './document-chunk.entity';
import { DocumentsService, DOCUMENT_QUEUE } from './documents.service';
import { DocumentsController } from './documents.controller';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessor } from './document.processor';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentChunk]),
    BullModule.registerQueue({ name: DOCUMENT_QUEUE }),
    ApiKeysModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, EmbeddingService, DocumentProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
