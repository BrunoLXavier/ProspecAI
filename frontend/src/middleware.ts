// Middleware for internationalization routing
// Simplified for Next.js 14 App Router without [locale] folder structure
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple passthrough - locale handled by providers
  // This avoids redirect loops when using next-intl without [locale] folder
  return NextResponse.next();
}

export const config = {
  // Match all pathnames except for API routes and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
