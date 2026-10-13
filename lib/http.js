// Ответы и вход в админку
import crypto from 'node:crypto';

const secret = () => crypto.createHash('sha256').update('invest47:' + (process.env.BLOB_READ_WRITE_TOKEN || 'dev')).digest();
const sign = (s, key = secret()) => crypto.createHmac('sha256', key).update(s).digest('base64url').slice(0, 32);
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const html = (body, status = 200, cache = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600') =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });


/* Вход в админку: пароль из переменной ADMIN_PASSWORD, токен живёт 30 дней.
   Смена пароля сразу делает старые токены недействительными. */
const adminKey = () => crypto.createHash('sha256').update('admin:' + (process.env.ADMIN_PASSWORD || '') + ':' + secret().toString('hex')).digest();
export function checkPassword(p) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || typeof p !== 'string') return false;
  const a = crypto.createHash('sha256').update(p).digest(), b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}
export function adminToken() {
  const exp = String(Date.now() + 30 * 864e5);
  return exp + '.' + sign('adm:' + exp, adminKey());
}
export function isAdmin(req) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [exp, s] = tok.split('.');
  if (!process.env.ADMIN_PASSWORD || !exp || !s) return false;
  return same(s, sign('adm:' + exp, adminKey())) && Number(exp) > Date.now();
}


export const clean = (v, max = 300) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
