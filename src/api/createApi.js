// The demo's «server»: an in-browser API that answers in the shapes the production frontend reads
// (contracts/shapes.json), waits a little like a network would, and keeps its data in this browser only
// (localStorage). It never sends a request anywhere.
//
// Every method is async and returns a copy, so a page can never change the data by accident — only through a
// method, exactly as with a real server. Permission checks happen HERE (a cashier asking to move products is
// refused by the API, not only hidden by the menu).

import { buildSeed, SEED_VERSION, stockUnitsOf, variantLabelOf } from '../data/seed.js';
import { FINISHES, GOVERNORATES } from '../data/catalog.js';
import { computeTotals, lineTotal } from '../lib/money.js';
import { fold, matchesQuery, scoreMatch, slugify } from '../lib/text.js';
import { readKind } from '../lib/kinds.js';
import { orderSearchFields } from '../lib/orderSearch.js';
import { can, DEMO_ACCOUNTS, hasAnyAdmin, PERMISSIONS, ROLE_PERMISSIONS } from '../lib/permissions.js';
import { canMove, NEXT_STATUSES, nextOnHappyPath, isOpenStatus, RESTOCKING_STATUSES } from '../lib/orderFlow.js';

export const STORAGE_KEY = 'abosefen-demo:state';
export const LOW_STOCK = 3;
// A product that IS the kind of thing a search asks for (SRCH-9) — more than a word at a name's start, less than a word.
const KIND_WEIGHT = 15;

export class ApiError extends Error {
  constructor(status, code, details = {}) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function browserStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('abosefen-demo:probe', '1');
      window.localStorage.removeItem('abosefen-demo:probe');
      return window.localStorage;
    }
  } catch {
    /* private mode or blocked storage: the demo still works, it just forgets on reload */
  }
  return memoryStorage();
}

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export function createApi({ storage = browserStorage(), latency = [150, 450], now = () => Date.now() } = {}) {
  let db = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === SEED_VERSION) return parsed;
      }
    } catch {
      /* a broken copy is replaced by a fresh one */
    }
    return buildSeed(now());
  }

  function persist() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full or blocked — keep working in memory */
    }
  }

  function changed() {
    persist();
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* a listener's failure is its own */
      }
    });
  }

  function wait() {
    const [min, max] = latency;
    const ms = min + Math.random() * Math.max(0, max - min);
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }

  /** Every public method goes through here: the «network» delay, then a copy of the answer. */
  async function respond(fn) {
    await wait();
    return clone(fn());
  }

  // ── Session & permissions ─────────────────────────────────────────────────────────────────────
  const sessionOut = () =>
    db.session
      ? { ...db.session, permissions: ROLE_PERMISSIONS[db.session.role] || [] }
      : null;

  function requirePermission(permission) {
    if (!db.session) throw new ApiError(401, 'signInRequired');
    if (!can(db.session, permission)) throw new ApiError(403, 'forbidden', { permission });
  }

  function logActivity(type, details) {
    db.counters.activity += 1;
    db.activity.unshift({
      id: `act-${db.counters.activity}`,
      type,
      at: new Date(now()).toISOString(),
      by: db.session?.email || 'guest',
      details,
    });
    db.activity = db.activity.slice(0, 200);
  }

  // ── Categories ────────────────────────────────────────────────────────────────────────────────
  const namesOf = (c) => ({ ar: c.nameAr, en: c.name, de: c.nameDe || c.name });
  const categoryById = (id) => db.categories.find((c) => c.id === id) || null;
  const byOrder = (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.name.localeCompare(b.name);
  const childrenOf = (id) => db.categories.filter((c) => c.parentCategoryId === id).sort(byOrder);

  function pathOf(id) {
    const chain = [];
    const seen = new Set();
    let c = categoryById(id);
    while (c && !seen.has(c.id)) {
      seen.add(c.id);
      chain.unshift(c);
      c = c.parentCategoryId ? categoryById(c.parentCategoryId) : null;
    }
    return chain;
  }

  function descendantsOf(id) {
    const out = [];
    const stack = [id];
    while (stack.length) {
      const current = stack.pop();
      for (const child of db.categories.filter((c) => c.parentCategoryId === current)) {
        out.push(child.id);
        stack.push(child.id);
      }
    }
    return out;
  }

  const branchOf = (id) => [id, ...descendantsOf(id)];
  const directCount = (id) => db.products.filter((p) => p.isActive && p.categoryId === id).length;
  const branchCount = (id) => {
    const ids = new Set(branchOf(id));
    return db.products.filter((p) => p.isActive && ids.has(p.categoryId)).length;
  };
  const pathOut = (id) => pathOf(id).map((c) => ({ id: c.id, slug: c.slug, name: namesOf(c) }));

  function categoryOut(c) {
    const childCount = childrenOf(c.id).length;
    return {
      id: c.id,
      _id: c.id,
      code: c.code,
      slug: c.slug,
      parentCategoryId: c.parentCategoryId,
      displayOrder: c.displayOrder,
      name: namesOf(c),
      art: c.art,
      childCount,
      isLeaf: childCount === 0,
      productCount: branchCount(c.id),
      directProductCount: directCount(c.id),
      depth: pathOf(c.id).length - 1,
    };
  }

  /** All categories in tree order (parents before their children). */
  function categoriesInTreeOrder() {
    const out = [];
    const walk = (parentId) => {
      for (const c of childrenOf(parentId)) {
        out.push(categoryOut(c));
        walk(c.id);
      }
    };
    walk(null);
    return out;
  }

  // ── Stock ─────────────────────────────────────────────────────────────────────────────────────
  const productById = (id) => db.products.find((p) => p.id === id) || null;
  const unitKey = (productId, variantId) => variantId || productId;
  const qtyOf = (key) => {
    const row = db.stock[key];
    return row ? Object.values(row).reduce((a, b) => a + b, 0) : 0;
  };

  function availableOf(product, variantId = null) {
    if (product.productType === 'bundle') {
      return Math.min(
        ...product.bundle.components.map((c) => Math.floor(qtyOf(unitKey(c.productId, c.variantId)) / c.quantity)),
      );
    }
    if (product.variants.length) {
      if (variantId) return qtyOf(variantId);
      return product.variants.reduce((sum, v) => sum + qtyOf(v.id), 0);
    }
    return qtyOf(product.id);
  }

  // ── «Notify me when it's back» (production's STK-13) ─────────────────────────────────────────
  // A request waits on one stock unit (an option, or the product itself). The moment that unit goes from nothing to sell
  // to some — a receipt, a transfer, a count, a cancelled order — its waiting requests are told, once.
  const stockAlerts = () => (db.stockAlerts = db.stockAlerts || []);
  const namesOfProduct = (p) => ({ ar: p.nameAr, en: p.name, de: p.nameDe || p.name });

  // ── «Found it cheaper?» (production's PRC-2) ───────────────────────────────────────────────────
  // A customer says where they saw one of the shop's products for less. The shop's price is the one the page shows (its
  // offer included), read here and never taken from the form; a price that is not lower is refused.
  const priceReports = () => (db.priceReports = db.priceReports || []);

  function tellArrivals(key, before) {
    if (before > 0 || qtyOf(key) <= 0) return;
    const at = new Date(now()).toISOString();
    for (const alert of stockAlerts()) {
      if (alert.state === 'waiting' && alert.unit === key) {
        alert.state = 'arrived';
        alert.arrivedAt = at;
      }
    }
  }

  /** What a list of cart/order lines needs from the shelves, per stock unit (a set needs its parts). */
  function demandOf(lines) {
    const need = {};
    for (const line of lines) {
      const p = productById(line.productId);
      if (!p) continue;
      if (p.productType === 'bundle') {
        for (const c of p.bundle.components) {
          const key = unitKey(c.productId, c.variantId);
          need[key] = (need[key] || 0) + c.quantity * line.quantity;
        }
      } else {
        const key = unitKey(p.id, line.variantId);
        need[key] = (need[key] || 0) + line.quantity;
      }
    }
    return need;
  }

  function recordMovement(entry) {
    db.counters.movement += 1;
    const movement = {
      id: `mv-${db.counters.movement}`,
      number: db.counters.movement,
      at: new Date(now()).toISOString(),
      by: db.session?.email || 'guest',
      ...entry,
    };
    db.movements.unshift(movement);
    db.movements = db.movements.slice(0, 500);
    return movement;
  }

  const skuOfUnit = (key) => {
    for (const p of db.products) {
      if (p.id === key) return p.sku;
      const v = p.variants.find((x) => x.id === key);
      if (v) return v.sku;
    }
    return key;
  };
  const productIdOfUnit = (key) =>
    db.products.find((p) => p.id === key || p.variants.some((v) => v.id === key))?.id || null;

  // ── Pricing ───────────────────────────────────────────────────────────────────────────────────
  function promotionFor(product) {
    if (product.productType === 'bundle') return null;
    return (
      db.promotions.find(
        (pr) =>
          pr.isActive &&
          (!pr.appliesTo.brandCode || pr.appliesTo.brandCode === product.brandCode) &&
          (!pr.appliesTo.categoryId || branchOf(pr.appliesTo.categoryId).includes(product.categoryId)),
      ) || null
    );
  }

  function priceOf(product, variant = null) {
    const base = variant ? variant.price : product.price;
    const promo = promotionFor(product);
    if (promo) {
      return {
        salePrice: Math.round((base * (100 - promo.discountPercent)) / 100),
        originalPrice: base,
        isOnSale: true,
        discountPercentage: promo.discountPercent,
        promotionId: promo.id,
        currency: 'EGP',
      };
    }
    if (product.compareAtPrice && product.compareAtPrice > product.price) {
      const original = Math.round((base * product.compareAtPrice) / product.price);
      return {
        salePrice: base,
        originalPrice: original,
        isOnSale: true,
        discountPercentage: Math.round((1 - base / original) * 100),
        promotionId: null,
        currency: 'EGP',
      };
    }
    return { salePrice: base, originalPrice: base, isOnSale: false, discountPercentage: 0, promotionId: null, currency: 'EGP' };
  }

  // ── Product answers ───────────────────────────────────────────────────────────────────────────
  const brandOut = (code) => {
    const b = db.brands.find((x) => x.code === code);
    return b ? { code: b.code, name: { ar: b.nameAr, en: b.name, de: b.name }, countryOfOrigin: b.countryOfOrigin } : null;
  };
  const finishHexOf = (p) => (p.defaultFinish ? FINISHES[p.defaultFinish]?.hex : null) || null;

  function productOut(p, { detail = false } = {}) {
    const category = categoryById(p.categoryId);
    const available = availableOf(p);
    const out = {
      id: p.id,
      _id: p.id,
      sku: p.sku,
      slug: p.slug,
      modelCode: p.modelCode,
      name: { ar: p.nameAr, en: p.name, de: p.nameDe || p.name },
      brand: brandOut(p.brandCode),
      countryOfOrigin: brandOut(p.brandCode)?.countryOfOrigin || null,
      categoryId: p.categoryId,
      category: category ? { id: category.id, slug: category.slug, name: namesOf(category) } : null,
      productType: p.productType,
      art: { ...p.art, finishHex: finishHexOf(p) },
      images: [], // the demo draws its own pictures (see `art`); production sends [{ url, isPrimary }]
      pricing: priceOf(p),
      inventory: { inStock: available > 0, stockQuantity: available, quantity: available, lowStockThreshold: LOW_STOCK },
      variantCount: p.variants.filter((v) => !v.isHidden).length,
      variants: p.variants
        .filter((v) => !v.isHidden)
        .map((v) => {
          const qty = availableOf(p, v.id);
          return {
            id: v.id,
            sku: v.sku,
            colorCode: v.colorCode,
            colorName: v.colorName,
            colorHex: v.colorHex,
            sizeCode: v.sizeCode,
            sizeLabel: v.sizeLabel,
            priceOverride: v.priceOverride,
            isActive: v.isActive,
            isHidden: v.isHidden,
            label: variantLabelOf(v),
            pricing: priceOf(p, v),
            stockQuantity: qty,
            inStock: qty > 0,
          };
        }),
      isFeatured: p.isFeatured,
      bundle: p.bundle
        ? {
            availableAsBundle: true,
            partsTotal: p.bundle.partsTotal,
            savings: p.bundle.partsTotal - p.price,
            components: p.bundle.components.map((c) => {
              const part = productById(c.productId);
              const v = c.variantId ? part.variants.find((x) => x.id === c.variantId) : null;
              return {
                productId: part.id,
                variantId: c.variantId,
                quantity: c.quantity,
                name: { ar: part.nameAr, en: part.name, de: part.nameDe || part.name },
                slug: part.slug,
                sku: v ? v.sku : part.sku,
                variantLabel: v ? variantLabelOf(v) : null,
                art: { ...part.art, finishHex: v?.colorHex || finishHexOf(part) },
                unitPrice: v ? v.price : part.price,
                inStock: qtyOf(unitKey(part.id, c.variantId)) >= c.quantity,
              };
            }),
          }
        : null,
    };
    if (detail) {
      out.description = p.description;
      out.specifications = p.specifications;
      out.categoryPath = pathOut(p.categoryId);
    }
    return out;
  }

  const activeProducts = () => db.products.filter((p) => p.isActive);

  function sortProducts(list, sort, lang = 'en') {
    const name = (p) => (lang === 'ar' ? p.nameAr : lang === 'de' ? p.nameDe || p.name : p.name);
    const price = (p) => priceOf(p).salePrice;
    const sorted = [...list];
    if (sort === 'priceAsc') sorted.sort((a, b) => price(a) - price(b));
    else if (sort === 'priceDesc') sorted.sort((a, b) => price(b) - price(a));
    else if (sort === 'name') sorted.sort((a, b) => name(a).localeCompare(name(b), lang));
    else sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.id.localeCompare(b.id));
    return sorted;
  }

  function searchFields(p) {
    const brand = db.brands.find((b) => b.code === p.brandCode);
    const path = pathOf(p.categoryId);
    return {
      codes: [p.sku, p.modelCode],
      optionCodes: p.variants.map((v) => v.sku),
      names: [p.nameAr, p.name, p.nameDe || '', brand?.name || '', brand?.nameAr || ''],
      others: [
        ...path.flatMap((c) => [c.nameAr, c.name, c.nameDe || '']),
        ...p.variants.flatMap((v) => [...Object.values(v.colorName || {}), ...Object.values(v.sizeLabel || {})]),
      ],
    };
  }

  // ── Cart ──────────────────────────────────────────────────────────────────────────────────────
  const feeFor = (governorate) => GOVERNORATES.find((g) => g.code === governorate)?.fee ?? null;

  function cartOut({ deliveryMethod = null, governorate = null } = {}) {
    const lines = db.cart.lines
      .map((line) => {
        const p = productById(line.productId);
        if (!p || !p.isActive) return null;
        const v = line.variantId ? p.variants.find((x) => x.id === line.variantId) : null;
        const pricing = priceOf(p, v);
        const available = availableOf(p, line.variantId);
        return {
          lineKey: line.lineKey,
          id: p.id,
          productId: p.id,
          variantId: line.variantId,
          name: { ar: p.nameAr, en: p.name, de: p.nameDe || p.name },
          slug: p.slug,
          sku: v ? v.sku : p.sku,
          variantLabel: v ? variantLabelOf(v) : null,
          art: { ...p.art, finishHex: v?.colorHex || finishHexOf(p) },
          productType: p.productType,
          price: pricing.salePrice,
          originalPrice: pricing.originalPrice,
          isOnSale: pricing.isOnSale,
          quantity: line.quantity,
          lineTotal: lineTotal(pricing.salePrice, line.quantity),
          inStock: available >= line.quantity,
          stockQuantity: available,
        };
      })
      .filter(Boolean);
    const coupon = db.coupons.find((c) => c.code === db.cart.couponCode) || null;
    const shipping = deliveryMethod === 'delivery' ? feeFor(governorate) || 0 : 0;
    const totals = computeTotals(
      lines.map((l) => ({ price: l.price, quantity: l.quantity })),
      { discountPercent: coupon ? coupon.percent : 0, shipping },
    );
    return { lines, couponCode: coupon ? coupon.code : null, totals, itemCount: totals.itemCount };
  }

  function checkLineStock(product, variantId, wantedLines) {
    const need = demandOf(wantedLines);
    const keys =
      product.productType === 'bundle'
        ? product.bundle.components.map((c) => unitKey(c.productId, c.variantId))
        : [unitKey(product.id, variantId)];
    const short = keys.filter((k) => (need[k] || 0) > qtyOf(k));
    if (short.length) {
      const inCart = db.cart.lines
        .filter((l) => l.productId === product.id && l.variantId === variantId)
        .reduce((n, l) => n + l.quantity, 0);
      throw new ApiError(409, 'outOfStock', { available: Math.max(0, availableOf(product, variantId)), inCart });
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────────────────────────
  function canSeeOrder(order) {
    if (!order.customerEmail) return true; // a guest order is opened by its link
    if (!db.session) return false;
    return db.session.email === order.customerEmail || can(db.session, PERMISSIONS.orders);
  }

  function orderOut(order) {
    return { ...order, allowedNext: NEXT_STATUSES[order.status] || [], nextDemoStep: nextOnHappyPath(order.status) };
  }

  function takeFromShelves(key, quantity, firstWarehouse, ref) {
    const order = [firstWarehouse, ...db.warehouses.map((w) => w.id).filter((w) => w !== firstWarehouse)];
    let left = quantity;
    const delta = {};
    for (const w of order) {
      if (left <= 0) break;
      const have = db.stock[key]?.[w] || 0;
      const take = Math.min(have, left);
      if (take > 0) {
        db.stock[key][w] = have - take;
        delta[w] = -take;
        left -= take;
      }
    }
    recordMovement({
      type: 'sale',
      productId: productIdOfUnit(key),
      variantId: key === productIdOfUnit(key) ? null : key,
      sku: skuOfUnit(key),
      fromWarehouseId: Object.keys(delta)[0] || null,
      toWarehouseId: null,
      quantity,
      delta,
      note: ref,
    });
  }

  function putBack(order) {
    const need = demandOf(order.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })));
    for (const [key, quantity] of Object.entries(need)) {
      const before = qtyOf(key);
      db.stock[key] = db.stock[key] || { 'w-main': 0, 'w-show': 0 };
      db.stock[key]['w-main'] = (db.stock[key]['w-main'] || 0) + quantity;
      tellArrivals(key, before);
      recordMovement({
        type: 'return',
        productId: productIdOfUnit(key),
        variantId: key === productIdOfUnit(key) ? null : key,
        sku: skuOfUnit(key),
        fromWarehouseId: null,
        toWarehouseId: 'w-main',
        quantity,
        delta: { 'w-main': quantity },
        note: order.orderNumber,
      });
    }
  }

  // ── Validation helpers ────────────────────────────────────────────────────────────────────────
  const cleanName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
  function categoryNamesFrom(input) {
    const nameAr = cleanName(input.nameAr);
    const nameEn = cleanName(input.nameEn);
    const nameDe = cleanName(input.nameDe);
    const fields = {};
    if (!nameAr) fields.nameAr = 'required';
    if (!nameEn) fields.nameEn = 'required';
    for (const [k, v] of Object.entries({ nameAr, nameEn, nameDe })) if (v.length > 60) fields[k] = 'tooLong';
    if (Object.keys(fields).length) throw new ApiError(422, 'validation', { fields });
    return { nameAr, nameEn, nameDe: nameDe || nameEn };
  }

  function assertUniqueAmongSiblings(parentId, names, exceptId = null) {
    const siblings = db.categories.filter((c) => c.parentCategoryId === parentId && c.id !== exceptId);
    const clash = siblings.find((c) => fold(c.nameAr) === fold(names.nameAr) || fold(c.name) === fold(names.nameEn));
    if (clash) throw new ApiError(409, 'duplicateName', { name: namesOf(clash) });
  }

  // ── Bulk move (preview → apply, tied to what was previewed) ───────────────────────────────────
  function bulkMovePlan(productIds, targetCategoryId) {
    const ids = [...new Set(productIds || [])];
    const blockers = [];
    const target = categoryById(targetCategoryId);
    if (!ids.length) blockers.push({ code: 'nothingSelected' });
    if (!target) blockers.push({ code: 'targetMissing' });
    else if (childrenOf(target.id).length) blockers.push({ code: 'targetNotLeaf', details: { childCount: childrenOf(target.id).length } });
    const found = ids.map(productById).filter(Boolean);
    if (found.length < ids.length) blockers.push({ code: 'productsMissing', details: { count: ids.length - found.length } });

    const changes = [];
    const unchanged = [];
    for (const p of found) {
      const entry = {
        productId: p.id,
        sku: p.sku,
        name: { ar: p.nameAr, en: p.name, de: p.nameDe || p.name },
        from: { id: p.categoryId, path: pathOut(p.categoryId) },
        to: target ? { id: target.id, path: pathOut(target.id) } : null,
      };
      (target && p.categoryId === target.id ? unchanged : changes).push(entry);
    }
    if (!blockers.length && changes.length === 0) blockers.push({ code: 'nothingToMove' });

    const affected = new Map();
    const touch = (id) => {
      if (!affected.has(id)) affected.set(id, { id, path: pathOut(id), before: directCount(id), after: directCount(id) });
      return affected.get(id);
    };
    if (target && !blockers.some((b) => b.code === 'targetNotLeaf')) {
      for (const c of changes) {
        touch(c.from.id).after -= 1;
        touch(target.id).after += 1;
      }
    }

    const token = hash(JSON.stringify([target?.id || null, changes.map((c) => `${c.productId}>${c.from.id}`)]));
    return {
      target: target ? { ...categoryOut(target), path: pathOut(target.id) } : null,
      blockers,
      changes,
      unchanged,
      affectedCategories: [...affected.values()],
      counts: { selected: ids.length, willMove: changes.length, unchanged: unchanged.length },
      canApply: blockers.length === 0,
      token,
    };
  }

  // ── The public surface ────────────────────────────────────────────────────────────────────────
  return {
    /** Called after every change of the demo data (pages reload what they show). */
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Back to the starting data (and signed out). */
    async reset() {
      await wait();
      db = buildSeed(now());
      changed();
      return true;
    },

    // Session — GET /api/auth/me, POST /api/auth/login (demo: a role is picked, no password exists)
    getSession: () => respond(() => sessionOut()),
    listDemoAccounts: () => respond(() => DEMO_ACCOUNTS),
    signIn: (email) =>
      respond(() => {
        const account = DEMO_ACCOUNTS.find((a) => a.email === String(email || '').trim().toLowerCase());
        if (!account) throw new ApiError(404, 'unknownDemoAccount');
        db.session = { email: account.email, role: account.role, displayName: account.displayName };
        changed();
        return sessionOut();
      }),
    signOut: () =>
      respond(() => {
        db.session = null;
        changed();
        return null;
      }),

    // Catalogue — GET /api/categories, /api/categories/{slug}, /api/products, /api/products/{slug}
    // Production's CAT-50: a department with nothing shown is not shown to customers (its page answers like a missing
    // one) and comes back by itself when a product in it is shown; the team's panel asks for every department.
    listCategories: ({ includeHidden = false } = {}) =>
      respond(() => categoriesInTreeOrder().filter((c) => includeHidden || c.productCount > 0)),
    getCategory: (slug, { includeHidden = false } = {}) =>
      respond(() => {
        const c = db.categories.find((x) => x.slug === slug);
        if (!c || (!includeHidden && branchCount(c.id) === 0)) throw new ApiError(404, 'categoryNotFound');
        const children = childrenOf(c.id).filter((k) => includeHidden || branchCount(k.id) > 0).map(categoryOut);
        return { category: { ...categoryOut(c), subCategories: children }, path: pathOut(c.id), children };
      }),
    listBrands: () => respond(() => db.brands.map((b) => brandOut(b.code))),
    // Production's UX-20: several makers, a size and a finish (answered by ONE option the customer can see), and a
    // panel counted over the WHOLE list — each facet with the OTHER facets' choices applied, so a ticked maker never
    // empties the makers beside it.
    listProducts: ({ categoryId = null, brandCode = null, brandCodes = [], sizes = [], finishes = [], sort = 'featured', lang = 'en' } = {}) =>
      respond(() => {
        const branch = categoryId ? new Set(branchOf(categoryId)) : null;
        const all = activeProducts().filter((p) => !branch || branch.has(p.categoryId));
        const makers = brandCode ? [brandCode, ...brandCodes] : brandCodes;
        const byMaker = (p) => makers.length === 0 || makers.includes(p.brandCode);
        const seenOptions = (p) => (p.variants || []).filter((v) => v.isActive && !v.isHidden);
        const optionFits = (v, sizeList, finishList) =>
          (sizeList.length === 0 || sizeList.includes(v.sizeCode)) && (finishList.length === 0 || finishList.includes(v.colorCode));
        const byOption = (sizeList, finishList) => (p) =>
          (sizeList.length === 0 && finishList.length === 0) || seenOptions(p).some((v) => optionFits(v, sizeList, finishList));

        const list = all.filter((p) => byMaker(p) && byOption(sizes, finishes)(p));

        // [key, productId] rows → how many different products each key holds
        const tally = (rows) => {
          const counts = new Map();
          for (const [key, productId] of rows) {
            if (!counts.has(key)) counts.set(key, { ids: new Set() });
            counts.get(key).ids.add(productId);
          }
          return counts;
        };
        const makerCounts = tally(all.filter(byOption(sizes, finishes)).map((p) => [p.brandCode, p.id]));
        const ofMakers = all.filter(byMaker);
        const sizeRows = [];
        const finishRows = [];
        const sizeLabels = new Map();
        const finishInfo = new Map();
        for (const p of ofMakers) {
          for (const v of seenOptions(p)) {
            if (v.sizeCode && optionFits(v, [], finishes)) {
              sizeRows.push([v.sizeCode, p.id]);
              sizeLabels.set(v.sizeCode, v.sizeLabel);
            }
            if (v.colorCode && optionFits(v, sizes, [])) {
              finishRows.push([v.colorCode, p.id]);
              finishInfo.set(v.colorCode, { name: v.colorName, hex: v.colorHex });
            }
          }
        }
        const sizeOrder = (code) => {
          const n = parseFloat(String(code).replace(/[^\d.]/g, ''));
          return Number.isFinite(n) ? n : Number.MAX_VALUE;
        };
        const facets = {
          brands: [...makerCounts.entries()]
            .map(([code, c]) => ({ ...brandOut(code), count: c.ids.size }))
            .filter((b) => b.code)
            .sort((a, b) => b.count - a.count || a.name.en.localeCompare(b.name.en)),
          sizes: [...tally(sizeRows).entries()]
            .map(([key, c]) => ({ key, label: sizeLabels.get(key), count: c.ids.size }))
            .sort((a, b) => sizeOrder(a.key) - sizeOrder(b.key) || a.key.localeCompare(b.key)),
          finishes: [...tally(finishRows).entries()]
            .map(([code, c]) => ({ code, name: finishInfo.get(code).name, hex: finishInfo.get(code).hex, count: c.ids.size }))
            .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
        };

        return {
          items: sortProducts(list, sort, lang).map((p) => productOut(p)),
          total: list.length,
          brands: [...new Set(all.map((p) => p.brandCode))].map(brandOut).filter(Boolean),
          facets,
        };
      }),
    getProduct: (slug) =>
      respond(() => {
        const p = db.products.find((x) => x.slug === slug && x.isActive);
        if (!p) throw new ApiError(404, 'productNotFound');
        const out = productOut(p, { detail: true });
        out.moreFromBrand = activeProducts()
          .filter((x) => x.brandCode === p.brandCode && x.id !== p.id && x.productType !== 'bundle')
          .slice(0, 6)
          .map((x) => productOut(x));
        out.promotion = out.pricing.promotionId ? db.promotions.find((pr) => pr.id === out.pricing.promotionId) : null;
        return out;
      }),
    search: (q, { lang = 'en' } = {}) =>
      respond(() => {
        // as production's SRCH-9: the search is read as a product is, and the things asked for come first — after
        // the words found in the name (20 each), before a word at a name's start (5)
        const asked = readKind(q);
        const scored = activeProducts()
          .map((p) => ({ p, score: scoreMatch(q, searchFields(p)) }))
          .filter((x) => x.score > 0)
          .map((x) => ({ ...x, score: x.score + (asked && readKind(x.p.nameAr) === asked ? KIND_WEIGHT : 0) }))
          .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id));
        const categories = db.categories.filter((c) => matchesQuery(q, c.nameAr, c.name, c.nameDe || ''));
        void lang;
        return {
          query: q,
          folded: fold(q),
          items: scored.map((x) => productOut(x.p)),
          total: scored.length,
          categories: categories.map(categoryOut),
        };
      }),
    getHome: () =>
      respond(() => {
        const promo = db.promotions.find((p) => p.isActive) || null;
        const promoProducts = promo
          ? activeProducts().filter((p) => promotionFor(p)?.id === promo.id).slice(0, 10).map((p) => productOut(p))
          : [];
        return {
          promotion: promo ? { ...promo, products: promoProducts, category: categoryById(promo.appliesTo.categoryId) ? categoryOut(categoryById(promo.appliesTo.categoryId)) : null } : null,
          sections: childrenOf(null).map(categoryOut),
          featured: activeProducts().filter((p) => p.isFeatured && p.productType !== 'bundle').map((p) => productOut(p)),
          bundles: activeProducts().filter((p) => p.productType === 'bundle').map((p) => productOut(p)),
          stats: { products: activeProducts().length, categories: db.categories.length, brands: db.brands.length },
        };
      }),
    listGovernorates: () => respond(() => GOVERNORATES),

    // Cart — GET/POST/PUT/DELETE /api/cart
    getCart: (options) => respond(() => cartOut(options)),
    addToCart: ({ productId, variantId = null, quantity = 1 }) =>
      respond(() => {
        const p = productById(productId);
        if (!p || !p.isActive) throw new ApiError(404, 'productNotFound');
        const qty = Math.trunc(Number(quantity));
        if (!(qty >= 1 && qty <= 999)) throw new ApiError(422, 'quantityInvalid');
        if (p.variants.length && !p.variants.some((v) => v.id === variantId)) throw new ApiError(422, 'chooseOptions');
        if (!p.variants.length) variantId = null;
        const lineKey = variantId ? `${productId}:${variantId}` : productId;
        const lines = db.cart.lines.map((l) => ({ ...l }));
        const existing = lines.find((l) => l.lineKey === lineKey);
        if (existing) existing.quantity += qty;
        else lines.push({ lineKey, productId, variantId, quantity: qty });
        checkLineStock(p, variantId, lines);
        db.cart.lines = lines;
        changed();
        return cartOut();
      }),
    updateCartLine: (lineKey, quantity) =>
      respond(() => {
        const qty = Math.trunc(Number(quantity));
        const line = db.cart.lines.find((l) => l.lineKey === lineKey);
        if (!line) throw new ApiError(404, 'lineNotFound');
        if (qty <= 0) {
          db.cart.lines = db.cart.lines.filter((l) => l.lineKey !== lineKey);
        } else {
          if (qty > 999) throw new ApiError(422, 'quantityInvalid');
          const lines = db.cart.lines.map((l) => (l.lineKey === lineKey ? { ...l, quantity: qty } : { ...l }));
          checkLineStock(productById(line.productId), line.variantId, lines);
          db.cart.lines = lines;
        }
        changed();
        return cartOut();
      }),
    removeCartLine: (lineKey) =>
      respond(() => {
        db.cart.lines = db.cart.lines.filter((l) => l.lineKey !== lineKey);
        changed();
        return cartOut();
      }),
    applyCoupon: (code) =>
      respond(() => {
        const wanted = String(code || '').trim().toUpperCase();
        if (!wanted) {
          db.cart.couponCode = null;
          changed();
          return cartOut();
        }
        const coupon = db.coupons.find((c) => c.code === wanted);
        if (!coupon) throw new ApiError(422, 'couponInvalid');
        db.cart.couponCode = coupon.code;
        changed();
        return cartOut();
      }),

    // Checkout — POST /api/orders (SIMULATED: no payment provider is called; the card is never asked for)
    placeOrder: (details = {}) =>
      respond(() => {
        const name = cleanName(details.name);
        const phone = String(details.phone || '').trim();
        const address = cleanName(details.address);
        const deliveryMethod = details.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
        const paymentMethod = details.paymentMethod === 'cash' ? 'cash' : 'card';
        const governorate = details.governorate || null;
        const fields = {};
        if (name.length < 2) fields.name = 'required';
        if (phone.replace(/\D/g, '').length < 8) fields.phone = 'invalid';
        if (deliveryMethod === 'delivery') {
          if (feeFor(governorate) === null) fields.governorate = 'required';
          if (address.length < 5) fields.address = 'required';
        }
        if (Object.keys(fields).length) throw new ApiError(422, 'validation', { fields });
        if (!db.cart.lines.length) throw new ApiError(409, 'cartEmpty');

        const need = demandOf(db.cart.lines);
        const short = Object.entries(need).filter(([key, q]) => qtyOf(key) < q);
        if (short.length) {
          throw new ApiError(409, 'outOfStock', {
            items: short.map(([key, q]) => ({ sku: skuOfUnit(key), needed: q, available: qtyOf(key) })),
          });
        }

        const cart = cartOut({ deliveryMethod, governorate });
        db.counters.order += 1;
        const n = db.counters.order;
        const orderNumber = `DEMO-${n}`;
        const at = new Date(now()).toISOString();
        for (const [key, q] of Object.entries(need)) takeFromShelves(key, q, deliveryMethod === 'pickup' ? 'w-show' : 'w-main', orderNumber);

        const order = {
          id: `o-${n}`,
          orderNumber,
          status: 'Confirmed',
          paymentMethod,
          paymentStatus: paymentMethod === 'card' ? 'PaidSimulated' : 'CashOnDelivery',
          customerEmail: db.session?.email || null,
          customerName: name,
          phone,
          governorate: deliveryMethod === 'delivery' ? governorate : null,
          address: deliveryMethod === 'delivery' ? address : '',
          deliveryMethod,
          createdAt: at,
          items: cart.lines.map((l) => {
            db.counters.line += 1;
            return {
              id: `ol-${db.counters.line}`,
              productId: l.productId,
              variantId: l.variantId,
              productName: l.name,
              productSku: l.sku,
              slug: l.slug,
              variantLabel: l.variantLabel,
              art: l.art,
              colorHex: l.art.finishHex,
              quantity: l.quantity,
              unitPrice: l.price,
              lineTotal: l.lineTotal,
            };
          }),
          itemCount: cart.totals.itemCount,
          subtotal: cart.totals.subtotal,
          discount: cart.totals.discount,
          discountPercent: cart.totals.discountPercent,
          vat: cart.totals.vat,
          shipping: cart.totals.shipping,
          totalAmount: cart.totals.total,
          couponCode: cart.couponCode,
          history: [
            { status: 'Pending', at, by: db.session?.email || 'guest' },
            { status: 'Confirmed', at, by: 'system', note: paymentMethod === 'card' ? 'paymentSimulated' : 'cashOnDelivery' },
          ],
          placedHere: true,
        };
        db.orders.unshift(order);
        db.cart = { lines: [], couponCode: null };
        changed();
        return orderOut(order);
      }),
    getOrder: (id) =>
      respond(() => {
        const order = db.orders.find((o) => o.id === id || o.orderNumber === id);
        if (!order) throw new ApiError(404, 'orderNotFound');
        if (!canSeeOrder(order)) throw new ApiError(db.session ? 403 : 401, db.session ? 'forbidden' : 'signInRequired');
        return orderOut(order);
      }),
    listMyOrders: () =>
      respond(() => {
        const mine = db.session
          ? db.orders.filter((o) => o.customerEmail === db.session.email)
          : db.orders.filter((o) => o.placedHere && !o.customerEmail);
        return mine.map(orderOut);
      }),
    /** The customer's order page can play the shop's part: move the order one step along the usual road. */
    advanceOrderDemo: (id) =>
      respond(() => {
        const order = db.orders.find((o) => o.id === id);
        if (!order) throw new ApiError(404, 'orderNotFound');
        if (!canSeeOrder(order)) throw new ApiError(403, 'forbidden');
        const next = nextOnHappyPath(order.status);
        if (!next) throw new ApiError(409, 'noNextStep');
        order.status = next;
        if (next === 'Delivered' && order.paymentStatus === 'CashOnDelivery') order.paymentStatus = 'PaidOnDelivery';
        order.history.push({ status: next, at: new Date(now()).toISOString(), by: 'demo' });
        changed();
        return orderOut(order);
      }),

    // ── Back office ─────────────────────────────────────────────────────────────────────────────
    adminSummary: () =>
      respond(() => {
        if (!db.session) throw new ApiError(401, 'signInRequired');
        if (!hasAnyAdmin(db.session)) throw new ApiError(403, 'forbidden');
        const out = {};
        if (can(db.session, PERMISSIONS.products)) out.products = activeProducts().length;
        if (can(db.session, PERMISSIONS.categories)) out.categories = db.categories.length;
        if (can(db.session, PERMISSIONS.stock)) {
          const units = stockUnitsOf(activeProducts());
          out.lowStock = units.filter((u) => qtyOf(u.key) > 0 && qtyOf(u.key) <= LOW_STOCK).length;
          out.outOfStock = units.filter((u) => qtyOf(u.key) === 0).length;
        }
        if (can(db.session, PERMISSIONS.orders)) {
          out.openOrders = db.orders.filter((o) => isOpenStatus(o.status)).length;
          out.salesTotal = db.orders
            .filter((o) => !RESTOCKING_STATUSES.includes(o.status))
            .reduce((sum, o) => sum + o.totalAmount, 0);
        }
        return out;
      }),

    adminProducts: ({ q = '', categoryId = null } = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.products);
        const branch = categoryId ? new Set(branchOf(categoryId)) : null;
        return activeProducts()
          .filter((p) => !branch || branch.has(p.categoryId))
          .filter((p) => !q.trim() || scoreMatch(q, searchFields(p)) > 0)
          .map((p) => ({
            id: p.id,
            sku: p.sku,
            name: { ar: p.nameAr, en: p.name, de: p.nameDe || p.name },
            art: { ...p.art, finishHex: finishHexOf(p) },
            brand: brandOut(p.brandCode),
            categoryId: p.categoryId,
            categoryPath: pathOut(p.categoryId),
            price: priceOf(p).salePrice,
            stock: availableOf(p),
            variantCount: p.variants.length,
            productType: p.productType,
          }));
      }),
    previewBulkMove: ({ productIds, targetCategoryId }) =>
      respond(() => {
        requirePermission(PERMISSIONS.products);
        return bulkMovePlan(productIds, targetCategoryId);
      }),
    applyBulkMove: ({ productIds, targetCategoryId, token }) =>
      respond(() => {
        requirePermission(PERMISSIONS.products);
        const plan = bulkMovePlan(productIds, targetCategoryId);
        if (!plan.canApply) throw new ApiError(409, 'cannotApply', { blockers: plan.blockers });
        if (token !== plan.token) throw new ApiError(409, 'previewStale');
        for (const change of plan.changes) productById(change.productId).categoryId = targetCategoryId;
        logActivity('bulkMove', {
          count: plan.changes.length,
          target: plan.target.path,
          products: plan.changes.map((c) => c.sku),
        });
        changed();
        return { moved: plan.changes.length };
      }),

    addCategory: (input = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.categories);
        const names = categoryNamesFrom(input);
        const parentId = input.parentId || null;
        const parent = parentId ? categoryById(parentId) : null;
        if (parentId && !parent) throw new ApiError(404, 'categoryNotFound');
        if (parent && directCount(parent.id) > 0) {
          throw new ApiError(409, 'parentHasProducts', { count: directCount(parent.id) });
        }
        assertUniqueAmongSiblings(parentId, names);
        let slug = slugify(names.nameEn, 'category');
        while (db.categories.some((c) => c.slug === slug)) slug = `${slug}-${db.categories.length}`;
        const siblings = db.categories.filter((c) => c.parentCategoryId === parentId);
        const category = {
          id: `c-${slug}`,
          code: slug.toUpperCase().replace(/-/g, '_'),
          parentCategoryId: parentId,
          slug,
          name: names.nameEn,
          nameAr: names.nameAr,
          nameDe: names.nameDe,
          art: parent ? parent.art : { kind: 'generic' },
          displayOrder: Math.max(0, ...siblings.map((c) => c.displayOrder || 0)) + 1,
          isActive: true,
        };
        db.categories.push(category);
        logActivity('categoryAdd', { path: pathOut(category.id) });
        changed();
        return categoryOut(category);
      }),
    renameCategory: (id, input = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.categories);
        const c = categoryById(id);
        if (!c) throw new ApiError(404, 'categoryNotFound');
        const names = categoryNamesFrom(input);
        assertUniqueAmongSiblings(c.parentCategoryId, names, c.id);
        const before = namesOf(c);
        c.nameAr = names.nameAr;
        c.name = names.nameEn;
        c.nameDe = names.nameDe;
        logActivity('categoryRename', { before, after: namesOf(c) });
        changed();
        return categoryOut(c);
      }),
    moveCategory: (id, newParentId = null) =>
      respond(() => {
        requirePermission(PERMISSIONS.categories);
        const c = categoryById(id);
        if (!c) throw new ApiError(404, 'categoryNotFound');
        const parentId = newParentId || null;
        if (parentId === c.parentCategoryId) throw new ApiError(409, 'sameParent');
        if (parentId && (parentId === c.id || descendantsOf(c.id).includes(parentId))) {
          throw new ApiError(409, 'moveIntoItself');
        }
        const parent = parentId ? categoryById(parentId) : null;
        if (parentId && !parent) throw new ApiError(404, 'categoryNotFound');
        if (parent && directCount(parent.id) > 0) {
          throw new ApiError(409, 'parentHasProducts', { count: directCount(parent.id) });
        }
        assertUniqueAmongSiblings(parentId, { nameAr: c.nameAr, nameEn: c.name }, c.id);
        const before = pathOut(c.id);
        c.parentCategoryId = parentId;
        c.displayOrder = Math.max(0, ...db.categories.filter((x) => x.parentCategoryId === parentId && x.id !== c.id).map((x) => x.displayOrder || 0)) + 1;
        logActivity('categoryMove', { before, after: pathOut(c.id) });
        changed();
        return categoryOut(c);
      }),

    listWarehouses: () => respond(() => db.warehouses),
    adminStock: ({ q = '', onlyLow = false } = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.stock);
        const rows = [];
        for (const p of activeProducts()) {
          if (p.productType === 'bundle') continue;
          const units = p.variants.length ? p.variants.map((v) => ({ v })) : [{ v: null }];
          for (const { v } of units) {
            const key = unitKey(p.id, v?.id);
            const quantities = Object.fromEntries(db.warehouses.map((w) => [w.id, db.stock[key]?.[w.id] || 0]));
            const total = Object.values(quantities).reduce((a, b) => a + b, 0);
            rows.push({
              key,
              productId: p.id,
              variantId: v?.id || null,
              sku: v ? v.sku : p.sku,
              productSku: p.sku,
              name: { ar: p.nameAr, en: p.name, de: p.nameDe || p.name },
              variantLabel: v ? variantLabelOf(v) : null,
              art: { ...p.art, finishHex: v?.colorHex || finishHexOf(p) },
              quantities,
              total,
              isLow: total > 0 && total <= LOW_STOCK,
              isOut: total === 0,
              searchText: [p.sku, v?.sku, p.nameAr, p.name, p.nameDe, ...Object.values(v ? variantLabelOf(v) : {})].filter(Boolean),
            });
          }
        }
        return rows
          .filter((r) => !onlyLow || r.isLow || r.isOut)
          .filter((r) => !q.trim() || matchesQuery(q, r.searchText))
          .map(({ searchText, ...r }) => (void searchText, r));
      }),
    recordStockMovement: (input = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.stock);
        const p = productById(input.productId);
        if (!p) throw new ApiError(404, 'productNotFound');
        if (p.productType === 'bundle') throw new ApiError(409, 'bundleHasNoStock');
        let variantId = input.variantId || null;
        if (p.variants.length) {
          if (!p.variants.some((v) => v.id === variantId)) throw new ApiError(422, 'validation', { fields: { variantId: 'required' } });
        } else variantId = null;
        const key = unitKey(p.id, variantId);
        const warehouseIds = db.warehouses.map((w) => w.id);
        const type = input.type;
        if (!['receive', 'issue', 'transfer', 'adjust'].includes(type)) throw new ApiError(422, 'validation', { fields: { type: 'required' } });
        db.stock[key] = db.stock[key] || Object.fromEntries(warehouseIds.map((w) => [w, 0]));
        const row = db.stock[key];
        const before = qtyOf(key);
        const note = cleanName(input.note).slice(0, 140);
        const from = input.fromWarehouseId;
        const to = input.toWarehouseId;
        const fields = {};
        let movement;

        if (type === 'adjust') {
          const counted = Number(input.countedQuantity);
          if (!warehouseIds.includes(to)) fields.toWarehouseId = 'required';
          if (!(Number.isInteger(counted) && counted >= 0 && counted <= 100000)) fields.countedQuantity = 'invalid';
          if (Object.keys(fields).length) throw new ApiError(422, 'validation', { fields });
          const delta = counted - (row[to] || 0);
          if (delta === 0) throw new ApiError(409, 'noChange');
          row[to] = counted;
          movement = recordMovement({ type, productId: p.id, variantId, sku: skuOfUnit(key), fromWarehouseId: null, toWarehouseId: to, quantity: Math.abs(delta), delta: { [to]: delta }, note });
        } else {
          const quantity = Number(input.quantity);
          if (!(Number.isInteger(quantity) && quantity > 0 && quantity <= 100000)) fields.quantity = 'invalid';
          if ((type === 'issue' || type === 'transfer') && !warehouseIds.includes(from)) fields.fromWarehouseId = 'required';
          if ((type === 'receive' || type === 'transfer') && !warehouseIds.includes(to)) fields.toWarehouseId = 'required';
          if (type === 'transfer' && from && from === to) fields.toWarehouseId = 'sameWarehouse';
          if (Object.keys(fields).length) throw new ApiError(422, 'validation', { fields });
          if ((type === 'issue' || type === 'transfer') && (row[from] || 0) < quantity) {
            throw new ApiError(409, 'notEnoughStock', { available: row[from] || 0 });
          }
          const delta = {};
          if (type === 'issue' || type === 'transfer') {
            row[from] -= quantity;
            delta[from] = -quantity;
          }
          if (type === 'receive' || type === 'transfer') {
            row[to] = (row[to] || 0) + quantity;
            delta[to] = quantity;
          }
          movement = recordMovement({
            type,
            productId: p.id,
            variantId,
            sku: skuOfUnit(key),
            fromWarehouseId: type === 'receive' ? null : from,
            toWarehouseId: type === 'issue' ? null : to,
            quantity,
            delta,
            note,
          });
        }
        tellArrivals(key, before);
        logActivity('stockMovement', { number: movement.number, type, sku: movement.sku, delta: movement.delta });
        changed();
        return { movement, balance: { ...row }, total: qtyOf(key) };
      }),
    askStockAlert: ({ productId, variantId = null, name = '', mobile = '' } = {}) =>
      respond(() => {
        const p = productById(productId);
        if (!p || !p.isActive) throw new ApiError(404, 'productNotFound');
        if (p.productType === 'bundle') throw new ApiError(409, 'bundleHasNoStock');
        const unit = p.variants.length ? p.variants.find((v) => v.id === variantId)?.id : p.id;
        const fields = {};
        const who = cleanName(name).slice(0, 60);
        const phone = String(mobile ?? '').replace(/[\s-]/g, '');
        if (!unit) fields.variantId = 'required';
        if (!who) fields.name = 'required';
        if (!/^01[0125]\d{8}$/.test(phone)) fields.mobile = 'invalid';
        if (Object.keys(fields).length) throw new ApiError(422, 'validation', { fields });
        if (qtyOf(unit) > 0) throw new ApiError(409, 'inStockNow');
        let alert = stockAlerts().find((a) => a.state === 'waiting' && a.unit === unit && a.mobile === phone);
        if (!alert) {
          db.counters.stockAlert = (db.counters.stockAlert || 0) + 1;
          alert = { id: `alert-${db.counters.stockAlert}`, productId: p.id, unit, mobile: phone, state: 'waiting', at: new Date(now()).toISOString() };
          stockAlerts().unshift(alert);
        }
        alert.name = who;
        logActivity('stockAlert', { sku: skuOfUnit(unit) });
        changed();
        return { id: alert.id, state: alert.state };
      }),
    cancelStockAlert: (id) =>
      respond(() => {
        const before = stockAlerts().length;
        db.stockAlerts = stockAlerts().filter((a) => !(a.id === id && a.state === 'waiting'));
        if (db.stockAlerts.length === before) throw new ApiError(404, 'alertNotFound');
        changed();
        return true;
      }),
    adminStockAlerts: () =>
      respond(() => {
        requirePermission(PERMISSIONS.stock);
        return stockAlerts().map((a) => {
          const p = productById(a.productId);
          const v = p && a.unit !== p.id ? p.variants.find((x) => x.id === a.unit) : null;
          return { ...a, product: p ? namesOfProduct(p) : null, variantLabel: v ? variantLabelOf(v) : null, sku: skuOfUnit(a.unit) };
        });
      }),
    markStockAlertMessaged: (id, messaged = true) =>
      respond(() => {
        requirePermission(PERMISSIONS.stock);
        const alert = stockAlerts().find((a) => a.id === id && a.state !== 'waiting');
        if (!alert) throw new ApiError(404, 'alertNotFound');
        alert.state = messaged ? 'messaged' : 'arrived';
        alert.messagedBy = messaged ? db.session.email : null;
        changed();
        return { id: alert.id, state: alert.state };
      }),
    sendPriceReport: ({ productId, variantId = null, place = '', price = null, link = '', name = '', mobile = '' } = {}) =>
      respond(() => {
        const p = productById(productId);
        if (!p || !p.isActive) throw new ApiError(404, 'productNotFound');
        const v = p.variants.length ? p.variants.find((x) => x.id === variantId) : null;
        const fields = {};
        const where = cleanName(place).slice(0, 120);
        const theirs = Number(String(price ?? '').trim());
        const url = String(link ?? '').trim();
        const who = cleanName(name).slice(0, 60);
        const phone = String(mobile ?? '').replace(/[\s-]/g, '');
        if (p.variants.length && !v) fields.variantId = 'required';
        if (where.length < 2) fields.place = 'required';
        if (!(theirs > 0)) fields.price = 'invalid';
        if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url) || url.length > 500) fields.link = 'invalid';
        if (!who) fields.name = 'required';
        if (!/^01[0125]\d{8}$/.test(phone)) fields.mobile = 'invalid';
        if (Object.keys(fields).length) throw new ApiError(422, 'validation', { fields });
        const ours = priceOf(p, v).salePrice;
        if (theirs >= ours) throw new ApiError(409, 'notCheaper');
        db.counters.priceReport = (db.counters.priceReport || 0) + 1;
        const report = {
          id: `cheaper-${db.counters.priceReport}`,
          productId: p.id,
          unit: v ? v.id : p.id,
          place: where,
          ourPrice: ours,
          theirPrice: theirs,
          link: url,
          name: who,
          mobile: phone,
          state: 'new',
          at: new Date(now()).toISOString(),
        };
        priceReports().unshift(report);
        logActivity('priceReport', { sku: skuOfUnit(report.unit) });
        changed();
        return { id: report.id };
      }),
    adminPriceReports: () =>
      respond(() => {
        requirePermission(PERMISSIONS.products);
        return priceReports().map((r) => {
          const p = productById(r.productId);
          const v = p && r.unit !== p.id ? p.variants.find((x) => x.id === r.unit) : null;
          return { ...r, product: p ? namesOfProduct(p) : null, variantLabel: v ? variantLabelOf(v) : null, sku: skuOfUnit(r.unit) };
        });
      }),
    markPriceReportAnswered: (id, answered = true) =>
      respond(() => {
        requirePermission(PERMISSIONS.products);
        const report = priceReports().find((r) => r.id === id);
        if (!report) throw new ApiError(404, 'reportNotFound');
        report.state = answered ? 'answered' : 'new';
        report.answeredBy = answered ? db.session.email : null;
        changed();
        return { id: report.id, state: report.state };
      }),
    listMovements: ({ limit = 50 } = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.stock);
        return db.movements.slice(0, limit).map((m) => {
          const p = productById(m.productId);
          const v = p && m.variantId ? p.variants.find((x) => x.id === m.variantId) : null;
          return {
            ...m,
            name: p ? { ar: p.nameAr, en: p.name, de: p.nameDe || p.name } : null,
            variantLabel: v ? variantLabelOf(v) : null,
          };
        });
      }),

    adminOrders: ({ status = '', q = '' } = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.orders);
        const counts = {};
        db.orders.forEach((o) => {
          counts[o.status] = (counts[o.status] || 0) + 1;
        });
        const items = db.orders
          .filter((o) => !status || o.status === status)
          // as production's SRCH-11: everything a worker knows of an order finds it (src/lib/orderSearch.js)
          .filter((o) => !q.trim() || matchesQuery(q, orderSearchFields(o, db.products)))
          .map(orderOut);
        return { items, counts, total: db.orders.length };
      }),
    changeOrderStatus: (id, status) =>
      respond(() => {
        requirePermission(PERMISSIONS.orders);
        const order = db.orders.find((o) => o.id === id);
        if (!order) throw new ApiError(404, 'orderNotFound');
        if (!canMove(order.status, status)) throw new ApiError(409, 'statusNotAllowed', { from: order.status, to: status });
        const from = order.status;
        order.status = status;
        if (RESTOCKING_STATUSES.includes(status)) {
          putBack(order);
          if (order.paymentStatus === 'PaidSimulated' || order.paymentStatus === 'PaidOnDelivery') order.paymentStatus = 'RefundedSimulated';
        }
        if (status === 'Delivered' && order.paymentStatus === 'CashOnDelivery') order.paymentStatus = 'PaidOnDelivery';
        order.history.push({ status, at: new Date(now()).toISOString(), by: db.session.email });
        logActivity('orderStatus', { orderNumber: order.orderNumber, from, to: status });
        changed();
        return orderOut(order);
      }),

    listActivity: ({ limit = 30 } = {}) =>
      respond(() => {
        requirePermission(PERMISSIONS.activity);
        return db.activity.slice(0, limit);
      }),
  };
}
