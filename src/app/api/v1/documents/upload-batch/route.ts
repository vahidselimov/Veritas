import { NextRequest, NextResponse } from 'next/server';
import { MAX_BATCH_FILES, ingestBatchInCloud } from '@/lib/cloud-ingestion';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawFiles = formData.getAll('files').filter((f): f is File => f instanceof File);

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files provided in batch.', code: 'EMPTY_BATCH' },
        { status: 400 }
      );
    }

    if (rawFiles.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { error: `Batch limit is ${MAX_BATCH_FILES} files per request.`, code: 'BATCH_LIMIT_EXCEEDED' },
        { status: 400 }
      );
    }

    const fileBuffers = await Promise.all(
      rawFiles.map(async (f) => ({
        name: f.name,
        type: f.type,
        buffer: Buffer.from(await f.arrayBuffer()),
      }))
    );

    // 1. Forward multi-document batch to .NET 9 Core API when online
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const fwdFormData = new FormData();
      for (const item of fileBuffers) {
        fwdFormData.append(
          'files',
          new Blob([item.buffer], { type: item.type || 'application/octet-stream' }),
          item.name
        );
      }

      const res = await fetch(`${CORE_API_URL}/api/v1/documents/upload-batch`, {
        method: 'POST',
        body: fwdFormData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status < 500) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
    } catch {
      // .NET 9 Core unreachable (e.g., ocaq.dev cloud deploy) -> fall back to Node batch engine
    }

    // 2. Cloud Parity Mode: Batch validate, deduplicate & parse in Node.js
    const rebuiltFiles = fileBuffers.map(
      (item) => new File([item.buffer], item.name, { type: item.type })
    );
    const batchResult = await ingestBatchInCloud(rebuiltFiles);
    return NextResponse.json(batchResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Batch upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
