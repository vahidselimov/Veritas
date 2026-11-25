import { NextRequest, NextResponse } from 'next/server';
import { buildFallbackCoordinateResult } from '@/lib/fallback-coordinates';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

// Lightweight Next.js memory cache for cloud preview fallback mode
const fallbackCoordinateCache = new Map<string, { data: unknown; cachedAt: number }>();

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

    const url = new URL(`${CORE_API_URL}/api/v1/documents/${id}/coordinates`);
    if (pageParam) url.searchParams.set('pageNumber', pageParam);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const cacheHeader = res.headers.get('X-Coordinate-Cache') || 'MISS';
      const lookupMs = res.headers.get('X-Coordinate-Lookup-Ms') || '0';
      return NextResponse.json(data, {
        headers: {
          'X-Coordinate-Cache': cacheHeader,
          'X-Coordinate-Lookup-Ms': lookupMs,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }
  } catch {
    // Fallback when .NET 9 backend is in standby
  }

  const cacheKey = `${id}:${pageNumber ?? 'all'}`;
  const existing = fallbackCoordinateCache.get(cacheKey);
  if (existing && Date.now() - existing.cachedAt < 300_000) {
    return NextResponse.json(
      { ...(existing.data as Record<string, unknown>), cacheHit: true, lookupMs: 0.08 },
      { headers: { 'X-Coordinate-Cache': 'HIT' } }
    );
  }

  const payload = buildFallbackCoordinateResult(id, pageNumber);
  fallbackCoordinateCache.set(cacheKey, { data: payload, cachedAt: Date.now() });
  return NextResponse.json(payload, { headers: { 'X-Coordinate-Cache': 'MISS' } });
}
