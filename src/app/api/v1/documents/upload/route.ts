import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  extractPdfWithNodeParser,
  extractPlainTextChunks,
} from '@/lib/node-pdf-parser';
import {
  saveCloudUploadedFile,
  upsertCloudDocument,
  type StoredCloudDocument,
} from '@/lib/cloud-store';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded or file is empty.' }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf');
    const isText = lowerName.endsWith('.md') || lowerName.endsWith('.txt');
    if (!isPdf && !isText) {
      return NextResponse.json(
        { error: 'Only .pdf, .md, and .txt files are supported.' },
        { status: 400 }
      );
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // 1. Forward to C# .NET 9 Core API when online
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const fwdFormData = new FormData();
      fwdFormData.append(
        'file',
        new Blob([buffer], { type: file.type || (isPdf ? 'application/pdf' : 'text/plain') }),
        file.name
      );

      const res = await fetch(`${CORE_API_URL}/api/v1/documents/upload`, {
        method: 'POST',
        body: fwdFormData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // .NET 9 Core is in standby (e.g., ocaq.dev cloud deploy) -> use Node.js pdfjs-dist parser
    }

    // 2. Cloud Parity Mode: Parse real PDF / text with XY-Cut + Char Offsets in Node.js
    const docId = crypto.randomUUID();
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const savedPath = saveCloudUploadedFile(docId, file.name, buffer);

    let totalPages = 1;
    let chunks = [];

    if (isPdf) {
      const parsed = await extractPdfWithNodeParser(buffer, docId);
      totalPages = parsed.totalPages;
      chunks = parsed.chunks;
    } else {
      chunks = extractPlainTextChunks(buffer.toString('utf8'), docId);
      totalPages = chunks.length > 0 ? Math.max(...chunks.map((c) => c.pageNumber)) : 1;
    }

    const now = new Date().toISOString();
    const doc: StoredCloudDocument = {
      id: docId,
      name: file.name,
      filePath: savedPath,
      mimeType: file.type || (isPdf ? 'application/pdf' : 'text/plain'),
      fileSizeBytes: file.size,
      totalPages,
      checksum,
      status: 'indexed',
      metadataJson: JSON.stringify({
        mode: 'cloud-node-pdfjs-xycut',
        uploadedAt: now,
        chunkCount: chunks.length,
      }),
      createdAt: now,
      updatedAt: now,
    };

    upsertCloudDocument(doc, chunks);
    return NextResponse.json(doc);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
