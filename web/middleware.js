import { NextResponse } from 'next/server';

// 1. Utilisez la variable SERVER_URL injectée par le binding de Vercel 
// (votre middleware s'exécutant désormais sous Node.js, il y aura accès à l'exécution)
const API = process.env.SERVER_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function middleware(req) {
  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase();
  const { pathname } = req.nextUrl;

  // Intercepte uniquement la racine du site si ce n'est pas un hôte local ou Vercel standard
  const isLocal = !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app');
  if (isLocal || pathname !== '/') return NextResponse.next();

  try {
    const res = await fetch(`${API}/api/docs/by-domain/${host}`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const { slug } = await res.json();
      return NextResponse.rewrite(new URL(`/d/${slug}`, req.url));
    }
  } catch (error) {
    // API injoignable : redirection vers la page d'atterrissage normale au lieu de planter
  }
  return NextResponse.next();
}

// 2. CONFIGURATION CRITIQUE : Force l'utilisation du runtime Node.js standard
export const config = { 
  runtime: 'nodejs', 
  matcher: '/' 
};
