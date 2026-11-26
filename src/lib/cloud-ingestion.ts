import crypto from 'node:crypto';
import path from 'node:path';
import type {
  BatchIngestionItemResult,
  BatchIngestionResponse,
  DocumentChunkDto,
} from '@/types/document';
import {
  extractPdfWithNodeParser,
  extractPlainTextChunks,
} from '@/lib/node-pdf-parser';
import {
  findCloudDocumentByChecksum,
  saveCloudUploadedFile,
  upsertCloudDocument,
  type StoredCloudDocument,
} from '@/lib/cloud-store';

export const MAX_FILE_SIZE_BYTES = 125_829_120; // 120 MB
export const MAX_BATCH_FILES = 25;
const MIN_TEXT_CHARS_OCR = 50;
const ALLOWED_EXTS = ['.pdf', '.md', '.txt'];
const BLOCKED_PDF_TOKENS = [
  '/JavaScript',
  '/JS ',
  '/JS(',
  '/JS<',
  '/Launch',
  '/SubmitForm',
  '/ImportData',
];

function sanitizeText(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code === 0) continue;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    out += raw[i];
  }
  return out;
}

function hasPdfMagicHeader(buf: Buffer): boolean {
  const limit = Math.min(buf.length - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      buf[i] === 0x25 && // %
      buf[i + 1] === 0x50 && // P
      buf[i + 2] === 0x44 && // D
      buf[i + 3] === 0x46 && // F
      buf[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

export function validateBufferForIngestion(fileName: string, buffer: Buffer): {
  isValid: boolean;
  ext: string;
  errorCode?: string;
  errorMessage?: string;
  hasOpenAction: boolean;
} {
  const ext = path.extname(fileName || '').toLowerCase();
  if (!fileName || buffer.length === 0) {
    return {
      isValid: false,
      ext,
      errorCode: 'EMPTY_FILE',
      errorMessage: `File '${fileName || 'unnamed'}' is empty (0 bytes).`,
      hasOpenAction: false,
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      ext,
      errorCode: 'FILE_TOO_LARGE',
      errorMessage: `File '${fileName}' exceeds 120 MB limit.`,
      hasOpenAction: false,
    };
  }

  if (!ALLOWED_EXTS.includes(ext)) {
    return {
      isValid: false,
      ext,
      errorCode: 'UNSUPPORTED_EXTENSION',
      errorMessage: `Extension '${ext}' is not supported. Allowed: .pdf, .md, .txt.`,
      hasOpenAction: false,
    };
  }

  if (ext === '.pdf') {
    if (!hasPdfMagicHeader(buffer)) {
      return {
        isValid: false,
        ext,
        errorCode: 'INVALID_PDF_HEADER',
        errorMessage: `File '${fileName}' does not have a valid %PDF- binary header signature.`,
        hasOpenAction: false,
      };
    }

    const scanLen = Math.min(buffer.length, 2 * 1024 * 1024);
    const asciiScan = buffer.subarray(0, scanLen).toString('latin1');

    for (const token of BLOCKED_PDF_TOKENS) {
      if (asciiScan.includes(token)) {
        return {
          isValid: false,
          ext,
          errorCode: 'SECURITY_ACTIVE_CONTENT_BLOCKED',
          errorMessage: `File '${fileName}' rejected by PDF security policy (detected active trigger '${token.trim()}').`,
          hasOpenAction: false,
        };
      }
    }

    return {
      isValid: true,
      ext,
      hasOpenAction: asciiScan.includes('/OpenAction'),
    };
  }

  // Plain text / Markdown validation
  const probeLen = Math.min(buffer.length, 4096);
  for (let i = 0; i < probeLen; i++) {
    if (buffer[i] === 0) {
      return {
        isValid: false,
        ext,
        errorCode: 'BINARY_CONTENT_IN_TEXT',
        errorMessage: `File '${fileName}' contains binary null bytes and is not valid UTF-8 text.`,
        hasOpenAction: false,
      };
    }
  }

  return { isValid: true, ext, hasOpenAction: false };
}

export async function ingestSingleFileInCloud(
  file: File,
  batchSeen: Map<string, { doc: StoredCloudDocument; chunkCount: number }>
): Promise<BatchIngestionItemResult> {
  const safeName = path.basename(file.name || 'unnamed');
  if (file.size === 0) {
    return {
      fileName: safeName,
      status: 'rejected',
      isDuplicate: false,
      chunkCount: 0,
      totalPages: 0,
      errorCode: 'EMPTY_FILE',
      errorMessage: `File '${safeName}' is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      fileName: safeName,
      status: 'rejected',
      isDuplicate: false,
      chunkCount: 0,
      totalPages: 0,
      errorCode: 'FILE_TOO_LARGE',
      errorMessage: `File '${safeName}' exceeds 120 MB limit.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateBufferForIngestion(safeName, buffer);
  if (!validation.isValid) {
    return {
      fileName: safeName,
      status: 'rejected',
      isDuplicate: false,
      chunkCount: 0,
      totalPages: 0,
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    };
  }

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  const seenEntry = batchSeen.get(checksum);
  if (seenEntry) {
    return {
      fileName: safeName,
      status: 'duplicate',
      isDuplicate: true,
      chunkCount: seenEntry.chunkCount,
      totalPages: seenEntry.doc.totalPages,
      document: seenEntry.doc,
    };
  }

  const existing = findCloudDocumentByChecksum(checksum);
  if (existing) {
    batchSeen.set(checksum, existing);
    return {
      fileName: safeName,
      status: 'duplicate',
      isDuplicate: true,
      chunkCount: existing.chunkCount,
      totalPages: existing.doc.totalPages,
      document: existing.doc,
    };
  }

  const docId = crypto.randomUUID();
  const savedPath = saveCloudUploadedFile(docId, safeName, buffer);
  let totalPages = 1;
  let chunks: DocumentChunkDto[] = [];
  let docStatus: 'indexed' | 'ocr_required' = 'indexed';

  if (validation.ext === '.pdf') {
    try {
      const parsed = await extractPdfWithNodeParser(buffer, docId);
      totalPages = parsed.totalPages;
      chunks = parsed.chunks.map((c) => ({ ...c, content: sanitizeText(c.content) }));

      const extractedChars = chunks.reduce((sum, c) => sum + c.content.length, 0);
      if (extractedChars < MIN_TEXT_CHARS_OCR) {
        docStatus = 'ocr_required';
        if (chunks.length === 0) {
          const ocrNotice = `[OCR_REQUIRED] ${safeName} appears to be a scanned/image PDF (${extractedChars} extractable chars across ${totalPages} pages). Queued for OCR fallback.`;
          chunks.push({
            id: crypto.randomUUID(),
            documentId: docId,
            chunkIndex: 0,
            readingOrder: 0,
            columnIndex: 0,
            charStartIndex: 0,
            charEndIndex: ocrNotice.length,
            blockType: 'ocr_needed',
            pageNumber: 1,
            content: ocrNotice,
            bbox: { x: 0.05, y: 0.08, w: 0.9, h: 0.12 },
            lineBboxes: [{ x: 0.05, y: 0.08, w: 0.9, h: 0.12, charStart: 0, charEnd: ocrNotice.length }],
            tokenCount: Math.ceil(ocrNotice.length / 4),
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PDF parse failed';
      return {
        fileName: safeName,
        status: 'rejected',
        isDuplicate: false,
        chunkCount: 0,
        totalPages: 0,
        errorCode: 'CORRUPT_PDF',
        errorMessage: `Failed to parse PDF '${safeName}': ${msg}`,
      };
    }
  } else {
    chunks = extractPlainTextChunks(sanitizeText(buffer.toString('utf8')), docId);
    totalPages = chunks.length > 0 ? Math.max(...chunks.map((c) => c.pageNumber)) : 1;
  }

  const now = new Date().toISOString();
  const doc: StoredCloudDocument = {
    id: docId,
    name: safeName,
    filePath: savedPath,
    mimeType: file.type || (validation.ext === '.pdf' ? 'application/pdf' : 'text/plain'),
    fileSizeBytes: buffer.length,
    totalPages,
    checksum,
    status: docStatus,
    metadataJson: JSON.stringify({
      mode: 'cloud-node-pdfjs-xycut',
      uploadedAt: now,
      hasOpenAction: validation.hasOpenAction,
      chunkCount: chunks.length,
    }),
    createdAt: now,
    updatedAt: now,
  };

  upsertCloudDocument(doc, chunks);
  batchSeen.set(checksum, { doc, chunkCount: chunks.length });

  return {
    fileName: safeName,
    status: docStatus,
    isDuplicate: false,
    chunkCount: chunks.length,
    totalPages,
    document: doc,
  };
}

export async function ingestBatchInCloud(files: File[]): Promise<BatchIngestionResponse> {
  const response: BatchIngestionResponse = {
    totalFiles: files.length,
    indexedCount: 0,
    duplicateCount: 0,
    ocrRequiredCount: 0,
    rejectedCount: 0,
    results: [],
  };

  const batchSeen = new Map<string, { doc: StoredCloudDocument; chunkCount: number }>();
  for (const file of files) {
    const item = await ingestSingleFileInCloud(file, batchSeen);
    response.results.push(item);

    if (item.status === 'indexed') response.indexedCount++;
    else if (item.status === 'duplicate') response.duplicateCount++;
    else if (item.status === 'ocr_required') response.ocrRequiredCount++;
    else response.rejectedCount++;
  }

  return response;
}
