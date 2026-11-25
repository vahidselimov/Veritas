import { NextRequest, NextResponse } from 'next/server';
import { buildFallbackChunks } from '@/lib/fallback-coordinates';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const pageParam = req.nextUrl.searchParams.get('pageNumber');
  const pageNumber = pageParam ? Number(pageParam) : null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = new URL(`${CORE_API_URL}/api/v1/documents/${id}/chunks`);
    if (pageParam) url.searchParams.set('pageNumber', pageParam);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'X-Coordinate-Cache': res.headers.get('X-Coordinate-Cache') || 'MISS',
          'X-Coordinate-Lookup-Ms': res.headers.get('X-Coordinate-Lookup-Ms') || '0',
        },
      });
    }
  } catch {
    // Fallback
  }

  return NextResponse.json(buildFallbackChunks(id, pageNumber));
}
