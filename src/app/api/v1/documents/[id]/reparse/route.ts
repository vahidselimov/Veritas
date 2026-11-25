import fs from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCloudCoordinates,
  getCloudDocument,
  upsertCloudDocument,
} from '@/lib/cloud-store';
import { extractPdfWithNodeParser } from '@/lib/node-pdf-parser';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${CORE_API_URL}/api/v1/documents/${id}/reparse`, {
      method: 'POST',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Cloud preview fallback
  }

  const existing = getCloudDocument(id);
  if (existing && existing.filePath && fs.existsSync(existing.filePath) && existing.name.toLowerCase().endsWith('.pdf')) {
    const buffer = fs.readFileSync(existing.filePath);
    const parsed = await extractPdfWithNodeParser(buffer, id);
    upsertCloudDocument({ ...existing, totalPages: parsed.totalPages, updatedAt: new Date().toISOString() }, parsed.chunks);
  }

  const cached = getCloudCoordinates(id, null);
  return NextResponse.json(cached, {
    headers: { 'X-Coordinate-Cache': cached.cacheHit ? 'HIT' : 'MISS' },
  });
}
