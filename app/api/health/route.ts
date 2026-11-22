import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Process liveness only; no database credentials or private diagnostics exposed. */
export function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'stayhub' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
