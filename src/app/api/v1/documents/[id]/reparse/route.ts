import { NextRequest, NextResponse } from 'next/server';
import { buildFallbackCoordinateResult } from '@/lib/fallback-coordinates';

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
    // Cloud preview fallback without surfacing 5xx browser console errors
  }

  return NextResponse.json(
    {
      ...buildFallbackCoordinateResult(id, null),
      mode: 'cloud-preview-standby',
    },
    { headers: { 'X-Coordinate-Cache': 'MISS' } }
  );
}
