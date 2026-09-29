import fs from 'fs';
import path from 'path';

// Serves the marketing landing page at "/" (the editor lives at /app).
export const dynamic = 'force-static';

export function GET() {
  const html = fs.readFileSync(path.join(process.cwd(), 'landing', 'index.html'), 'utf8');
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
