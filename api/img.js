// Фото участков из закрытого хранилища. Пути случайные, поэтому кешируем навсегда.
import { getFile } from '../lib/store.js';

export async function GET(req) {
  const p = new URL(req.url).searchParams.get('p') || '';
  if (!/^photos\/[a-z0-9]{16}\.(jpg|webp|png)$/.test(p)) return new Response('Not found', { status: 404 });
  const r = await getFile(p);
  if (!r) return new Response('Not found', { status: 404 });
  return new Response(r.stream, {
    headers: { 'content-type': r.blob.contentType || 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' },
  });
}
