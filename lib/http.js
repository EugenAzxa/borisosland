// Ответы, подписи токенов, уведомления в Telegram
import crypto from 'node:crypto';
import { SITE } from './site.js';

const secret = () => crypto.createHash('sha256').update('invest47:' + (process.env.BLOB_READ_WRITE_TOKEN || 'dev')).digest();
const sign = (s, key = secret()) => crypto.createHmac('sha256', key).update(s).digest('base64url').slice(0, 32);
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const html = (body, status = 200, cache = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600') =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

/* Токен формы: выдаётся при открытии страницы. Отсекает ботов, которые шлют POST без страницы
   или отправляют форму быстрее 3 секунд. */
export function formToken() {
  const t = String(Date.now());
  return t + '.' + sign('form:' + t);
}
export function checkFormToken(tok) {
  const [t, s] = String(tok || '').split('.');
  if (!t || !s || !same(s, sign('form:' + t))) return 'bad';
  const age = Date.now() - Number(t);
  if (age < 3000) return 'fast';
  if (age > 12 * 3600e3) return 'old';
  return '';
}

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

/* Уведомление в Telegram, если заданы TG_BOT_TOKEN и TG_CHAT_ID (можно несколько чатов через запятую) */
export async function notify(text) {
  const token = process.env.TG_BOT_TOKEN, chats = (process.env.TG_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) return;
  await Promise.all(chats.map((chat_id) => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id, text: text + `\n\nАдминка: ${SITE.url}/admin`, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {})));
}

export const clean = (v, max = 300) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export const phoneOk = (p) => String(p).replace(/\D/g, '').length >= 10;
