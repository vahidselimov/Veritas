import { NextRequest, NextResponse } from 'next/server';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const pageNumber = req.nextUrl.searchParams.get('pageNumber');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const url = new URL(`${CORE_API_URL}/api/v1/documents/${id}/chunks`);
    if (pageNumber) url.searchParams.set('pageNumber', pageNumber);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback
  }

  // Fallback chunks
  return NextResponse.json([
    {
      id: 'chunk-1',
      documentId: id,
      chunkIndex: 0,
      pageNumber: 4,
      content:
        'By bypassing the standard runtime pinned memory allocations through unified virtual memory addressing and custom ring-buffer pools...',
      bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.12 },
      tokenCount: 42,
    },
    {
      id: 'chunk-2',
      documentId: id,
      chunkIndex: 1,
      pageNumber: 4,
      content:
        'Furthermore, asynchronous Direct Memory Access (DMA) transfers are directly mapped into contiguous physical host registers...',
      bbox: { x: 0.08, y: 0.44, w: 0.84, h: 0.14 },
      tokenCount: 48,
    },
  ]);
}
