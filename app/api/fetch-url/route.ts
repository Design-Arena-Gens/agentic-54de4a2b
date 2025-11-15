import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function extractMainText(html: string): { title?: string; description?: string; text?: string } {
  // Small and dependency-free heuristic extractor
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  const desc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] || '')
    || (html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1] || '');
  // Remove scripts/styles
  let body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // Keep headings and paragraphs
  body = body.replace(/\n+/g, ' ').replace(/<\/(h1|h2|h3|p)>/gi, '\n');
  // Strip tags
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { title, description: desc, text };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });
  }
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'CampaignAgent/1.0 (+https://agentic-54de4a2b.vercel.app)' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Fetch failed: ${res.status}` }), { status: 400 });
    }
    const html = await res.text();
    const out = extractMainText(html);
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
