import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

const protectedRoutes = ['/chat', '/api/chat'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  if (path === '/') {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  if (!isProtectedRoute) return NextResponse.next();

  const session = request.cookies.get('session')?.value;
  let isValid = false;
  if (session) {
    try {
      await decrypt(session);
      isValid = true;
    } catch (e) {
      isValid = false;
    }
  }

  if (!isValid && !path.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/signin', request.url));
  } else if (!isValid && path.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};