// Builds the demo's starting state: catalogue + stock + a few orders, movements and an activity note.
// Deterministic (a fixed pseudo-random sequence), so every browser and every test starts from the same numbers;
// only the dates are placed relative to «now» so the orders look recent.

import { BRANDS, CATEGORIES, COUPONS, PRODUCTS, PROMOTIONS, WAREHOUSES } from './catalog.js';
import { computeTotals, lineTotal } from '../lib/money.js';
import { HAPPY_PATH } from '../lib/orderFlow.js';

/** Raise when the shape of the stored state changes: a browser holding an older state is re-seeded. */
export const SEED_VERSION = 1;

function sequence(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The units stock is counted in: each variant, or the product itself when it has none. Sets have no own stock. */
export function stockUnitsOf(products) {
  const units = [];
  for (const p of products) {
    if (p.productType === 'bundle') continue;
    if (p.variants.length) p.variants.forEach((v) => units.push({ productId: p.id, variantId: v.id, key: v.id }));
    else units.push({ productId: p.id, variantId: null, key: p.id });
  }
  return units;
}

function seedStock(products) {
  const next = sequence(20261014);
  const stock = {};
  stockUnitsOf(products).forEach((unit, i) => {
    if (i % 13 === 5) stock[unit.key] = { 'w-main': 0, 'w-show': 0 }; // out of stock
    else if (i % 9 === 4) stock[unit.key] = { 'w-main': 0, 'w-show': 2 }; // running low
    else stock[unit.key] = { 'w-main': 4 + Math.floor(next() * 36), 'w-show': Math.floor(next() * 8) };
  });
  // The parts of every set are kept on the shelf, so the sets can be bought in the demo.
  for (const p of products) {
    if (p.productType !== 'bundle') continue;
    for (const c of p.bundle.components) {
      const key = c.variantId || c.productId;
      stock[key]['w-main'] = Math.max(stock[key]['w-main'], 12);
    }
  }
  return stock;
}

const DAY = 24 * 60 * 60 * 1000;

function orderLine(products, productId, variantId, quantity, n) {
  const p = products.find((x) => x.id === productId);
  const v = variantId ? p.variants.find((x) => x.id === variantId) : null;
  const unitPrice = v ? v.price : p.price;
  return {
    id: `ol-${n}`,
    productId,
    variantId,
    productName: { ar: p.nameAr, en: p.name, de: p.nameDe },
    productSku: v ? v.sku : p.sku,
    slug: p.slug,
    variantLabel: v ? variantLabelOf(v) : null,
    art: p.art,
    colorHex: v?.colorHex || null,
    quantity,
    unitPrice,
    lineTotal: lineTotal(unitPrice, quantity),
  };
}

/** «Chrome · 20 mm» in each language. */
export function variantLabelOf(v) {
  const parts = ['ar', 'en', 'de'].map((lang) => [v.colorName?.[lang], v.sizeLabel?.[lang]].filter(Boolean).join(' · '));
  return { ar: parts[0], en: parts[1], de: parts[2] };
}

function seedOrders(products, now) {
  const byModel = (model) => products.find((p) => p.modelCode === model);
  const variant = (model, finish, size) => {
    const p = byModel(model);
    return p.variants.find((v) => (!finish || v.finishKey === finish) && (!size || v.sizeCode === size))?.id || null;
  };
  const plan = [
    { n: 1001, email: 'customer@demo', name: 'عميل العرض', phone: '0100 000 0001', gov: 'cairo', status: 'Completed', daysAgo: 21, pay: 'card',
      lines: [['MIRA-B', 'chrome', null, 1], ['AV-1212', 'chrome', null, 2]] },
    { n: 1002, email: 'customer@demo', name: 'عميل العرض', phone: '0100 000 0001', gov: 'cairo', status: 'Shipped', daysAgo: 3, pay: 'cash',
      lines: [['NOVA-1P', 'white', null, 1], ['SH-V', 'chrome', null, 1]] },
    { n: 1003, email: null, name: 'Karim (demo)', phone: '0100 000 0002', gov: 'giza', status: 'Preparing', daysAgo: 1, pay: 'card',
      lines: [['PN20', null, '25', 10], ['EL90', null, '25', 24], ['TEE', null, '25', 8]] },
    { n: 1004, email: 'customer@demo', name: 'عميل العرض', phone: '0100 000 0001', gov: 'cairo', status: 'Confirmed', daysAgo: 0, pay: 'card',
      lines: [['S1', null, '8050', 1], ['SORA-K', 'black', null, 1]] },
    { n: 1005, email: null, name: 'نادية — عرض', phone: '0100 000 0003', gov: 'alexandria', status: 'Pending', daysAgo: 0, pay: 'cash',
      lines: [['TB', 'gold', '60', 2], ['RH', 'gold', null, 1]] },
    { n: 1006, email: null, name: 'Demo Contractor Co.', phone: '0100 000 0004', gov: 'qalyubia', status: 'Cancelled', daysAgo: 6, pay: 'cash',
      lines: [['LINA-CC', 'white', null, 3], ['LINA-PB', 'white', null, 3]] },
  ];
  let lineNo = 1;
  return plan.map((o) => {
    const created = now - o.daysAgo * DAY - 3 * 60 * 60 * 1000;
    const items = o.lines.map(([model, finish, size, qty]) =>
      orderLine(products, byModel(model).id, variant(model, finish, size), qty, lineNo++),
    );
    const shipping = o.gov === 'cairo' || o.gov === 'giza' ? 150 : o.gov === 'qalyubia' ? 200 : 250;
    const totals = computeTotals(items.map((l) => ({ price: l.unitPrice, quantity: l.quantity })), { shipping });
    const path = o.status === 'Cancelled' ? ['Pending', 'Confirmed', 'Cancelled'] : HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(o.status) + 1);
    const step = path.length > 1 ? Math.min(6 * 60 * 60 * 1000, (now - created) / path.length) : 0;
    return {
      id: `o-${o.n}`,
      orderNumber: `DEMO-${o.n}`,
      status: o.status,
      paymentMethod: o.pay,
      paymentStatus: o.pay === 'card' ? 'PaidSimulated' : o.status === 'Completed' ? 'PaidOnDelivery' : 'CashOnDelivery',
      customerEmail: o.email,
      customerName: o.name,
      phone: o.phone,
      governorate: o.gov,
      address: 'عنوان تجريبى — Demo address',
      deliveryMethod: 'delivery',
      createdAt: new Date(created).toISOString(),
      items,
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      discount: totals.discount,
      discountPercent: 0,
      vat: totals.vat,
      shipping: totals.shipping,
      totalAmount: totals.total,
      couponCode: null,
      history: path.map((status, i) => ({
        status,
        at: new Date(created + i * step).toISOString(),
        by: i === 0 ? 'customer' : 'owner@demo',
      })),
      isSeed: true,
    };
  });
}

function seedMovements(products, now) {
  const pick = (model) => products.find((p) => p.modelCode === model);
  const mira = pick('MIRA-B');
  const pipe = pick('PN20');
  return [
    {
      id: 'mv-1', number: 1, type: 'receive', productId: pipe.id, variantId: pipe.variants[1].id, sku: pipe.variants[1].sku,
      fromWarehouseId: null, toWarehouseId: 'w-main', quantity: 40, delta: { 'w-main': 40 }, note: '',
      by: 'owner@demo', at: new Date(now - 9 * DAY).toISOString(),
    },
    {
      id: 'mv-2', number: 2, type: 'transfer', productId: mira.id, variantId: mira.variants[0].id, sku: mira.variants[0].sku,
      fromWarehouseId: 'w-main', toWarehouseId: 'w-show', quantity: 2, delta: { 'w-main': -2, 'w-show': 2 }, note: '',
      by: 'owner@demo', at: new Date(now - 4 * DAY).toISOString(),
    },
  ];
}

export function buildSeed(now = Date.now()) {
  const products = JSON.parse(JSON.stringify(PRODUCTS));
  return {
    version: SEED_VERSION,
    seededAt: new Date(now).toISOString(),
    brands: JSON.parse(JSON.stringify(BRANDS)),
    categories: JSON.parse(JSON.stringify(CATEGORIES)),
    products,
    warehouses: JSON.parse(JSON.stringify(WAREHOUSES)),
    promotions: JSON.parse(JSON.stringify(PROMOTIONS)),
    coupons: JSON.parse(JSON.stringify(COUPONS)),
    stock: seedStock(products),
    movements: seedMovements(products, now),
    orders: seedOrders(products, now),
    activity: [
      { id: 'act-1', type: 'seeded', at: new Date(now).toISOString(), by: 'system', details: {} },
    ],
    cart: { lines: [], couponCode: null },
    session: null,
    counters: { order: 1006, movement: 2, activity: 1, line: 100 },
  };
}
