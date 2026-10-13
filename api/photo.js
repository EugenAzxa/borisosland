// Загрузка одного фото к участку - только из админки. Браузер заранее уменьшает фото до 1600 px (JPEG),
// здесь проверяем вход, размер и что это действительно картинка.
import { json, isAdmin } from '../lib/http.js';
import { putPhoto } from '../lib/store.js';

const MAX = 3 * 1024 * 1024;

export async function POST(req) {
  if (!isAdmin(req)) return json({ error: 'Нужно войти заново' }, 401);
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX) return json({ error: 'Фото больше 3 МБ' }, 413);
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > MAX) return json({ error: 'Фото пустое или больше 3 МБ' }, 413);

  let ext, type;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) { ext = 'jpg'; type = 'image/jpeg'; }
  else if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') { ext = 'webp'; type = 'image/webp'; }
  else if (buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') { ext = 'png'; type = 'image/png'; }
  else return json({ error: 'Нужен JPEG, PNG или WebP' }, 415);

  const path = await putPhoto(buf, ext, type);
  return json({ path });
}
