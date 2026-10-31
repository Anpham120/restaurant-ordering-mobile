#!/usr/bin/env node
// Simple load test (Node >= 18, no dependencies).
// Usage: node perf/load-test.js [baseUrl] [secondsPerScenario]
const BASE = process.argv[2] || 'http://localhost:8080';
const SECS = Number(process.argv[3] || 30);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = { 'Content-Type': 'application/json' };

async function call(method, path, body, token) {
  const headers = { ...(body ? J : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) };
  const t0 = performance.now();
  let ok = false;
  try {
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    await res.text();
    ok = res.status < 400;
    return { ms: performance.now() - t0, ok, status: res.status };
  } catch { return { ms: performance.now() - t0, ok: false, status: 0 }; }
}
async function json(method, path, body, token) {
  const res = await fetch(BASE + path, { method, headers: { ...(body ? J : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (res.status >= 400) throw new Error(method + ' ' + path + ' -> ' + res.status);
  return res.json();
}

function summarize(name, samples, seconds, extra = '') {
  const ms = samples.map(s => s.ms).sort((a, b) => a - b);
  const errors = samples.filter(s => !s.ok).length;
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
  const p = q => ms[Math.min(ms.length - 1, Math.floor(ms.length * q))];
  return { scenario: name + extra, requests: samples.length, avgMs: +avg.toFixed(1), p95Ms: +p(0.95).toFixed(1), maxMs: +ms[ms.length - 1].toFixed(1),
    errorPct: +(100 * errors / samples.length).toFixed(2), rps: +(samples.length / seconds).toFixed(1) };
}

// closed loop: N workers each send as fast as possible for `secs`
async function closedLoop(n, secs, fn) {
  const end = Date.now() + secs * 1000, out = [];
  await Promise.all(Array.from({ length: n }, async (_, w) => { while (Date.now() < end) out.push(await fn(w)); }));
  return out;
}
// open loop: fixed arrival rate
async function openLoop(rps, secs, fn) {
  const end = Date.now() + secs * 1000, out = [], pending = [];
  let i = 0;
  const start = Date.now();
  while (Date.now() < end) {
    pending.push(fn(i++).then(r => out.push(r)));
    const next = start + (i * 1000) / rps;
    await sleep(Math.max(0, next - Date.now()));
  }
  await Promise.all(pending);
  return out;
}

(async () => {
  const login = async (u, p) => (await json('POST', '/api/auth/login', { username: u, password: p })).token;
  const manager = await login('manager', 'manager123');
  const kitchen = await login('kitchen', 'kitchen123');
  const staff = await login('staff', 'staff123');
  const menu = await json('GET', '/api/menu');
  const dish = menu[0].id;
  const run = Date.now().toString(36);
  const tables = [];
  for (let i = 0; i < 120; i++) tables.push((await json('POST', '/api/admin/tables', { code: `L${run}-${i}`, seats: 4 }, manager)).qrToken);
  const order = (qr) => call('POST', '/api/orders', { qrToken: qr, items: [{ menuItemId: dish, quantity: 1 }] });
  const results = [];
  const warm = async () => { for (let i = 0; i < 200; i++) await call('GET', '/api/menu'); };
  await warm();

  console.error('PT01a GET /api/menu, 50 concurrent');
  results.push(summarize('PT01a GET /api/menu (50 users)', await closedLoop(50, SECS, () => call('GET', '/api/menu')), SECS));
  console.error('PT01b GET /api/menu, 100 concurrent');
  results.push(summarize('PT01b GET /api/menu (100 users)', await closedLoop(100, SECS, () => call('GET', '/api/menu')), SECS));

  console.error('PT02 POST /api/orders, 50 req/s');
  results.push(summarize('PT02 POST /api/orders (50 req/s)', await openLoop(50, SECS, i => order(tables[i % 60])), SECS));

  console.error('PT03 PATCH order-items status, 30 req/s');
  const orders = await Promise.all(tables.slice(60, 100).map(qr => json('POST', '/api/orders', { qrToken: qr, items: [{ menuItemId: dish, quantity: 1 }] })));
  const itemIds = orders.map(o => o.items[0].id);
  results.push(summarize('PT03 PATCH item status (30 req/s)', await openLoop(30, SECS,
    i => call('PATCH', `/api/order-items/${itemIds[i % itemIds.length]}/status`, { status: i % 2 ? 'READY' : 'COOKING' }, kitchen)), SECS));

  console.error('PT04 mixed: 100 customers + 10 staff/kitchen');
  const mixed = [];
  const end = Date.now() + SECS * 1000;
  const customers = Array.from({ length: 100 }, async (_, w) => {
    const qr = tables[(w % 20) + 100];
    while (Date.now() < end) {
      mixed.push(await call('GET', '/api/menu'));
      if (Math.random() < 0.3) mixed.push(await order(qr));
      await sleep(100 + Math.random() * 200);
    }
  });
  const staffers = Array.from({ length: 10 }, async (_, w) => {
    while (Date.now() < end) { mixed.push(await call('GET', '/api/orders?status=PENDING', null, w % 2 ? staff : kitchen)); await sleep(300); }
  });
  await Promise.all([...customers, ...staffers]);
  results.push(summarize('PT04 mixed (100 customers + 10 staff)', mixed, SECS));

  console.table(results);
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
