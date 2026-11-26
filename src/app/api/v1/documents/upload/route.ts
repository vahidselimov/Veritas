import { NextRequest, NextResponse } from 'next/server';
import { ingestSingleFileInCloud } from '@/lib/cloud-ingestion';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No file uploaded or file is empty.', code: 'EMPTY_FILE' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Forward to C# .NET 9 Core API when online
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const fwdFormData = new FormData();
      fwdFormData.append(
        'file',
        new Blob([buffer], { type: file.type || 'application/octet-stream' }),
        file.name
      );

      const res = await fetch(`${CORE_API_URL}/api/v1/documents/upload`, {
        method: 'POST',
        body: fwdFormData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Propagate both 2xx successes and explicit 400 validation rejections
      if (res.status < 500) {
        const data = await res.json();
        return NextResponse.json(data, {
          status: res.status,
          headers: {
            'X-Veritas-Duplicate': res.headers.get('X-Veritas-Duplicate') || 'false',
          },
        });
      }
    } catch {
      // .NET 9 Core unreachable (e.g., ocaq.dev cloud deploy) -> fall back to Node ingestion engine
    }

    // 2. Cloud Parity Mode: Validate, deduplicate & parse in Node.js
    const rebuiltFile = new File([buffer], file.name, { type: file.type });
    const result = await ingestSingleFileInCloud(rebuiltFile, new Map());
    if (result.status === 'rejected' || !result.document) {
      return NextResponse.json(
        { error: result.errorMessage || 'Upload validation failed.', code: result.errorCode },
        { status: 400 }
      );
    }

    return NextResponse.json(result.document, {
      headers: {
        'X-Veritas-Duplicate': result.isDuplicate ? 'true' : 'false',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
