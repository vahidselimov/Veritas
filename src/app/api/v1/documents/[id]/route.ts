import { NextRequest, NextResponse } from 'next/server';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${CORE_API_URL}/api/v1/documents/${id}`, {
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

  return NextResponse.json({
    id,
    name: id.endsWith('.pdf') ? id : `${id}.pdf`,
    totalPages: 18,
    status: 'indexed',
  });
}
