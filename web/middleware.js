import { NextResponse } from 'next/server';

// Resolves a request that arrives on a reader's own custom domain (set in a
// document's settings) to that document's public page, so the domain field
// added in the editor actually serves something instead of sitting unused.
const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function middleware(req) {
  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase();
  const { pathname } = req.nextUrl;

  // Only intercept the site root, on a host that clearly isn't this deployment itself.
  const isLocal = !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app');
  if (isLocal || pathname !== '/') return NextResponse.next();

  try {
    const res = await fetch(`${API}/api/docs/by-domain/${host}`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const { slug } = await res.json();
      return NextResponse.rewrite(new URL(`/d/${slug}`, req.url));
    }
  } catch {
    // API unreachable: fall through to the normal landing page rather than error out.
  }
  return NextResponse.next();
}

export const config = { matcher: '/' };
