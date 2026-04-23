import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { Request } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { DocumentsService } from './documents.service';
import type { RequestUser } from '../auth/jwt.strategy';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const ALLOWED_EXTS = new Set(['.pdf', '.txt', '.md', '.docx', '.png', '.jpg', '.jpeg', '.webp']);

function getBasePath() {
  return process.env.WORKSPACE_BASE_PATH ?? '/workspaces';
}

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const tmpDir = path.join(getBasePath(), 'documents', '_tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not supported: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async upload(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new NotFoundException('No file uploaded');
    const { workspaceId } = req.user as RequestUser;
    return this.documentsService.upload(workspaceId, file, getBasePath());
  }

  @Get()
  findAll(@Req() req: Request, @Query('status') status?: string) {
    const { workspaceId } = req.user as RequestUser;
    return this.documentsService.list(workspaceId, status);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const { workspaceId } = req.user as RequestUser;
    return this.documentsService.findOne(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const { workspaceId } = req.user as RequestUser;
    await this.documentsService.remove(id, workspaceId);
  }

  @Post('search')
  async search(
    @Req() req: Request,
    @Body() body: { query: string; limit?: number; documentIds?: string[] },
  ) {
    const { workspaceId } = req.user as RequestUser;
    const limit = Math.min(body.limit ?? 5, 20);
    return this.documentsService.search(workspaceId, body.query, limit, body.documentIds);
  }
}
