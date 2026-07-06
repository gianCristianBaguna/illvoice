import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  const adminToken = request.cookies.get('adminToken')?.value;
  const pathname = request.nextUrl.pathname;

  const publicPaths = [
    '/login',
    '/admin/login',
    '/api/auth/login',
    '/api/auth/google-signin',
    '/api/auth/register-barangay-official',
    '/api/auth/register-admin',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/admin/barangays',
    '/api/reports',
    '/api/reports/activity',
    '/api/reports/urgent',
  ];

  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (adminToken && (pathname === '/login' || pathname === '/admin/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  if (!adminToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};