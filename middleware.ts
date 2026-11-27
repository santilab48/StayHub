import { NextRequest, NextResponse } from 'next/server'

/**
 * Application-level cutover maintenance gate. Opt-in only.
 * Allow exactly the read-only DB health endpoints needed for pre-cutover checks.
 * Everything under /api except those health endpoints is blocked, even GET:
 * some GET handlers can update session or throttling state.
 *
 * Middleware alone is not a database-wide write freeze. See P28E2 runbook.
 */
export function middleware(request: NextRequest) {
  if (process.env.STAYHUB_WRITE_FREEZE !== 'YES') return NextResponse.next()

  const path = request.nextUrl.pathname
  if (path === '/api/health/db' || path === '/api/health/db/transport' || path === '/api/health/db/freeze') {
    return NextResponse.next()
  }

  if (path.startsWith('/api/')) {
    return NextResponse.json(
      { status: 'maintenance', message: 'StayHub is temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '120' } },
    )
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    return new NextResponse('Maintenance in progress', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '120' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
}
