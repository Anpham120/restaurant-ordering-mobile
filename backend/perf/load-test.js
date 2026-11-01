#!/usr/bin/env node
// Load test for the Atlas Restaurant API (Node >= 18, no dependencies).
// Needs a running backend with the sample menu (APP_SEED_DEMO=true) and a manager account.
// Usage: node perf/load-test.js <baseUrl> <managerPhone> <managerPassword> [secondsPerScenario]
// It creates test staff/customer accounts and orders, so never point it at a production database.
const [BASE = 'http://localhost:8080', ADMIN_PHONE = '0900000001', ADMIN_PASSWORD = 'Atlas@123', SECS_ARG = '30'] = process.argv.slice(2);
const SECS = Number(SECS_ARG);
const CUSTOMERS = 100;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const headers = (token, body) => ({ ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) });

/** One timed request; ok = HTTP status below 400. */
async function call(method, path, body, token) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, { method, headers: headers(token, body), body: body ? JSON.stringify(body) : undefined });
    await res.text();
    return { ms: performance.now() - t0, ok: res.status < 400, status: res.status };
  } catch {
    return { ms: performance.now() - t0, ok: false, status: 0 };
  }
}

async function json(method, path, body, token) {
  const res = await fetch(BASE + path, { method, headers: headers(token, body), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (res.status >= 400) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

function summarize(name, samples, seconds) {
  const ms = samples.map(s => s.ms).sort((a, b) => a - b);
  const errors = samples.filter(s => !s.ok).length;
  const pct = q => ms[Math.min(ms.length - 1, Math.floor(ms.length * q))];
  return {
    scenario: name, requests: samples.length,
    avgMs: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(1), p95Ms: +pct(0.95).toFixed(1), maxMs: +ms[ms.length - 1].toFixed(1),
    errorPct: +(100 * errors / samples.length).toFixed(2), rps: +(samples.length / seconds).toFixed(1),
  };
}

/** N workers sending back-to-back requests for `secs` seconds. */
async function closedLoop(n, secs, fn) {
  const end = Date.now() + secs * 1000, out = [];
  await Promise.all(Array.from({ length: n }, async (_, w) => { while (Date.now() < end) out.push(await fn(w)); }));
  return out;
}

/** Requests started at a fixed rate, whatever the response time. */
async function openLoop(rps, secs, fn, max = Infinity) {
  const end = Date.now() + secs * 1000, start = Date.now(), out = [], pending = [];
  let i = 0;
  while (Date.now() < end && i < max) {
    pending.push(fn(i++).then(r => out.push(r)));
    await sleep(Math.max(0, start + (i * 1000) / rps - Date.now()));
  }
  await Promise.all(pending);
  return out;
}

(async () => {
  const run = Date.now().toString().slice(-6);
  const admin = (await json('POST', '/api/auth/login', { login: ADMIN_PHONE, password: ADMIN_PASSWORD })).token;
  // take orders all day while testing
  const store = await json('GET', '/api/admin/settings', null, admin);
  await json('PUT', '/api/admin/settings', { ...store, hotline: store.hotline, openTime: '00:00', closeTime: '23:59:59', acceptingOrders: true }, admin);

  const staffPhone = '097' + run + '1', kitchenPhone = '097' + run + '2';
  await json('POST', '/api/admin/staff', { fullName: 'Perf staff', phone: staffPhone, password: 'Passw0rd!', role: 'STAFF' }, admin);
  const staff = (await json('POST', '/api/auth/login', { login: staffPhone, password: 'Passw0rd!' })).token;

  const zone = (await json('GET', '/api/zones'))[0];
  const menu = await json('GET', '/api/menu');
  // a dish without required options, so a plain add-to-cart is valid
  const dish = menu.find(m => m.available && m.optionGroups.every(g => g.minSelect === 0));

  console.error(`preparing ${CUSTOMERS} customers…`);
  const customers = [];
  for (let i = 0; i < CUSTOMERS; i++) {
    const phone = '08' + run + String(i).padStart(2, '0');
    const token = (await json('POST', '/api/auth/register', { fullName: 'Perf ' + i, phone, password: 'Passw0rd!' })).token;
    const addr = await json('POST', '/api/me/addresses', { zoneId: zone.id, label: 'Nhà', recipientName: 'Perf ' + i, recipientPhone: phone, street: i + ' Lê Lợi', makeDefault: true }, token);
    customers.push({ token, addressId: addr.id });
  }
  const placeOrder = async (c) => {
    await call('POST', '/api/me/cart/items', { menuItemId: dish.id, quantity: 2 }, c.token);
    return call('POST', '/api/me/orders', { addressId: c.addressId }, c.token);
  };

  const results = [];
  for (let i = 0; i < 200; i++) await call('GET', '/api/menu'); // warm-up

  console.error('PT01 menu');
  results.push(summarize('PT01a Xem thực đơn – 50 người dùng', await closedLoop(50, SECS, () => call('GET', '/api/menu')), SECS));
  results.push(summarize('PT01b Xem thực đơn – 100 người dùng', await closedLoop(100, SECS, () => call('GET', '/api/menu')), SECS));

  console.error('PT02 place orders');
  results.push(summarize('PT02 Đặt hàng – 20 đơn/giây', await openLoop(20, SECS, i => placeOrder(customers[i % CUSTOMERS])), SECS));

  console.error('PT03 confirm orders');
  const pending = (await json('GET', '/api/manage/orders?status=PENDING&size=100&sort=oldest', null, staff)).content.map(o => o.id);
  const more = (await json('GET', '/api/manage/orders?status=PENDING&size=100&page=1&sort=oldest', null, staff)).content.map(o => o.id);
  const ids = [...pending, ...more];
  const confirmSecs = Math.min(SECS, Math.floor(ids.length / 10));
  results.push(summarize('PT03 Nhân viên xác nhận đơn – 10 lượt/giây',
    await openLoop(10, confirmSecs, i => call('PATCH', `/api/manage/orders/${ids[i]}/status`, { status: 'CONFIRMED' }, staff), ids.length), confirmSecs));

  console.error('PT04 mixed');
  const mixed = [], end = Date.now() + SECS * 1000;
  const shoppers = customers.map(async (c, w) => {
    while (Date.now() < end) {
      mixed.push(await call('GET', '/api/menu'));
      mixed.push(await call('GET', `/api/menu/${menu[w % menu.length].id}`));
      if (Math.random() < 0.1) mixed.push(await placeOrder(c));
      await sleep(300 + Math.random() * 400);
    }
  });
  const board = Array.from({ length: 10 }, async () => {
    while (Date.now() < end) {
      mixed.push(await call('GET', '/api/manage/orders?status=PENDING&status=CONFIRMED&status=PREPARING&status=READY&status=DELIVERING&sort=oldest', null, staff));
      await sleep(1000);
    }
  });
  await Promise.all([...shoppers, ...board]);
  results.push(summarize('PT04 Hỗn hợp – 100 khách + 10 màn hình bảng đơn', mixed, SECS));

  console.table(results);
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
