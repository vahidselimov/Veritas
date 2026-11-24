import { NextResponse } from 'next/server';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${CORE_API_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // .NET Core API is in standby on this host (e.g. cloud preview)
  }

  // Fallback health status on cloud preview
  return NextResponse.json({
    status: 'healthy',
    gateway: 'Next.js 14 App Router',
    cloudEnvironment: 'ocaq.dev',
    netCore: 'standby',
    message: '.NET 9 Core Engine is in Standby mode. For full dual-engine, connect CORE_API_URL or run npm run dev:all locally.',
    timestamp: new Date().toISOString(),
  });
}
