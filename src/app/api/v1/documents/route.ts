import { NextResponse } from 'next/server';
import { getCloudDocuments } from '@/lib/cloud-store';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${CORE_API_URL}/api/v1/documents`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback if .NET API is in standby
  }

  return NextResponse.json(getCloudDocuments());
}
