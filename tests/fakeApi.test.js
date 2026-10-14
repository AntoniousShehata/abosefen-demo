import { beforeEach, describe, expect, it } from 'vitest';
import { createApi, memoryStorage, STORAGE_KEY } from '../src/api/createApi.js';
import { SEED_VERSION } from '../src/data/seed.js';

let api;
let storage;

const fresh = () => {
  storage = memoryStorage();
  api = createApi({ storage, latency: [0, 0] });
};

const productBy = async (predicate) => {
  const { items } = await api.listProducts({});
  return items.find(predicate);
};

beforeEach(fresh);

describe('catalogue answers', () => {
  it('serves the category tree with leaf flags and branch counts', async () => {
    const categories = await api.listCategories();
    const roots = categories.filter((c) => !c.parentCategoryId);
    expect(roots.length).toBe(6);
    const valves = categories.find((c) => c.slug === 'valves');
    expect(valves.isLeaf).toBe(false);
    expect(valves.productCount).toBeGreaterThan(0);
    expect(valves.directProductCount).toBe(0);
  });

  it('returns a product in the shape the production frontend reads', async () => {
    const p = await api.getProduct((await productBy((x) => x.modelCode === 'MIRA-B')).slug);
    expect(p.name).toEqual(expect.objectContaining({ ar: expect.any(String), en: expect.any(String), de: expect.any(String) }));
    expect(p.pricing).toEqual(expect.objectContaining({ salePrice: expect.any(Number), originalPrice: expect.any(Number), isOnSale: true, discountPercentage: 15 }));
    expect(p.inventory).toEqual(expect.objectContaining({ inStock: expect.any(Boolean), stockQuantity: expect.any(Number) }));
    expect(p.variants.length).toBe(3);
    expect(p.variants[0]).toEqual(expect.objectContaining({ id: expect.any(String), sku: expect.any(String), colorCode: 'CHR', priceOverride: null }));
    expect(p.categoryPath.map((c) => c.slug)).toEqual(['mixers', 'basin-mixers']);
  });

  it('applies the promotion: 15 % off Nilora mixers only', async () => {
    const mira = await productBy((x) => x.modelCode === 'MIRA-B');
    expect(mira.pricing.originalPrice).toBe(1450);
    expect(mira.pricing.salePrice).toBe(1233); // 1450 × 0.85 = 1232.5 → 1233
    const vela = await productBy((x) => x.modelCode === 'VELA-B'); // another brand, with its own old price
    expect(vela.pricing.promotionId).toBeNull();
    expect(vela.pricing.originalPrice).toBe(2950);
  });

  it('computes a set’s stock from its parts', async () => {
    const set = await productBy((x) => x.productType === 'bundle');
    expect(set.bundle.components.length).toBeGreaterThan(2);
    expect(set.inventory.stockQuantity).toBeGreaterThan(0);
    expect(set.bundle.savings).toBeGreaterThan(0);
  });

  it('finds products whatever form of the Arabic letters is typed', async () => {
    const a = await api.search('قاعده');
    const b = await api.search('قاعدة');
    expect(a.total).toBeGreaterThan(0);
    expect(a.items.map((p) => p.id)).toEqual(b.items.map((p) => p.id));
    expect((await api.search('احواض استانلس')).total).toBeGreaterThan(0);
    expect((await api.search('رمادي')).items.some((p) => p.modelCode === 'G1')).toBe(true); // stored as «رمادى»
    expect((await api.search('mixer')).total).toBe((await api.search('خلاط')).total);
    expect((await api.search('NIL-MIRA-B')).items[0].modelCode).toBe('MIRA-B');
  });
});

describe('cart totals', () => {
  it('adds lines, applies the coupon before VAT and charges VAT 14 %', async () => {
    const angle = await productBy((x) => x.modelCode === 'AV-1238'); // 90 EGP, no variants, no promotion
    let cart = await api.addToCart({ productId: angle.id, quantity: 10 });
    expect(cart.totals.subtotal).toBe(900);
    expect(cart.totals.vat).toBe(126);
    expect(cart.totals.total).toBe(1026);

    cart = await api.applyCoupon('demo10');
    expect(cart.couponCode).toBe('DEMO10');
    expect(cart.totals.discount).toBe(90);
    expect(cart.totals.vat).toBe(113.4); // 14 % of 810
    expect(cart.totals.total).toBe(923.4);

    await expect(api.applyCoupon('NOPE')).rejects.toMatchObject({ code: 'couponInvalid' });
  });

  it('asks for the options of a product that has them', async () => {
    const mira = await productBy((x) => x.modelCode === 'MIRA-B');
    await expect(api.addToCart({ productId: mira.id })).rejects.toMatchObject({ code: 'chooseOptions' });
    const cart = await api.addToCart({ productId: mira.id, variantId: mira.variants[1].id, quantity: 1 });
    expect(cart.lines[0].variantLabel.en).toBe('Matte black');
    expect(cart.lines[0].price).toBe(Math.round(mira.variants[1].pricing.originalPrice * 0.85));
  });

  it('refuses more than the shelves hold', async () => {
    const angle = await productBy((x) => x.modelCode === 'AV-1238');
    await expect(api.addToCart({ productId: angle.id, quantity: angle.inventory.stockQuantity + 1 })).rejects.toMatchObject({
      code: 'outOfStock',
    });
  });

  it('changes and removes lines', async () => {
    const angle = await productBy((x) => x.modelCode === 'AV-1238');
    const cart = await api.addToCart({ productId: angle.id, quantity: 1 });
    const key = cart.lines[0].lineKey;
    expect((await api.updateCartLine(key, 3)).totals.itemCount).toBe(3);
    expect((await api.updateCartLine(key, 0)).lines).toHaveLength(0);
  });
});

describe('simulated checkout and orders', () => {
  it('places an order, takes the goods off the shelves, and a cancel puts them back', async () => {
    const angle = await productBy((x) => x.modelCode === 'AV-1238');
    const before = angle.inventory.stockQuantity;
    await api.addToCart({ productId: angle.id, quantity: 2 });
    await expect(api.placeOrder({ name: '', phone: '1' })).rejects.toMatchObject({ code: 'validation' });
    const order = await api.placeOrder({ name: 'Test', phone: '0100 000 0000', deliveryMethod: 'delivery', governorate: 'cairo', address: 'Demo street 1', paymentMethod: 'card' });
    expect(order.status).toBe('Confirmed');
    expect(order.paymentStatus).toBe('PaidSimulated');
    expect(order.shipping).toBe(150);
    expect(order.vat).toBe(25.2); // 14 % of 180
    expect(order.totalAmount).toBe(355.2);
    expect((await productBy((x) => x.id === angle.id)).inventory.stockQuantity).toBe(before - 2);
    expect((await api.getCart()).lines).toHaveLength(0);

    await api.signIn('owner@demo');
    const cancelled = await api.changeOrderStatus(order.id, 'Cancelled');
    expect(cancelled.status).toBe('Cancelled');
    expect(cancelled.paymentStatus).toBe('RefundedSimulated');
    expect((await productBy((x) => x.id === angle.id)).inventory.stockQuantity).toBe(before);
  });

  it('a set takes its parts off the shelves', async () => {
    const set = await productBy((x) => x.modelCode === 'SET-LINA');
    const part = set.bundle.components.find((c) => c.quantity === 2);
    const partBefore = (await api.getProduct(part.slug)).variants.find((v) => v.id === part.variantId)?.stockQuantity;
    await api.addToCart({ productId: set.id, quantity: 1 });
    await api.placeOrder({ name: 'Test', phone: '01000000000', deliveryMethod: 'pickup', paymentMethod: 'cash' });
    const partAfter = (await api.getProduct(part.slug)).variants.find((v) => v.id === part.variantId)?.stockQuantity;
    expect(partAfter).toBe(partBefore - 2);
  });

  it('only allows the next statuses of the order road', async () => {
    await api.signIn('cashier@demo');
    const { items } = await api.adminOrders({ status: 'Shipped' });
    await expect(api.changeOrderStatus(items[0].id, 'Preparing')).rejects.toMatchObject({ code: 'statusNotAllowed' });
    const delivered = await api.changeOrderStatus(items[0].id, 'Delivered');
    expect(delivered.allowedNext).toEqual(['Completed', 'Returned']);
  });

  it('the customer page can simulate the next step', async () => {
    await api.signIn('customer@demo');
    const mine = await api.listMyOrders();
    const confirmed = mine.find((o) => o.status === 'Confirmed');
    const next = await api.advanceOrderDemo(confirmed.id);
    expect(next.status).toBe('Preparing');
    expect(next.history.at(-1).status).toBe('Preparing');
  });
});

describe('roles are enforced by the API', () => {
  it('refuses the back office to a visitor and to a customer', async () => {
    await expect(api.adminProducts()).rejects.toMatchObject({ code: 'signInRequired' });
    await api.signIn('customer@demo');
    await expect(api.adminOrders()).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('lets the cashier see orders but not move products or stock', async () => {
    await api.signIn('cashier@demo');
    expect((await api.adminOrders()).items.length).toBeGreaterThan(0);
    await expect(api.previewBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-ppr-fittings' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.recordStockMovement({ type: 'receive', productId: 'p-012', toWarehouseId: 'w-main', quantity: 1 })).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});

describe('stock movements', () => {
  beforeEach(async () => {
    await api.signIn('owner@demo');
  });

  const rowOf = async (productId, variantId = null) =>
    (await api.adminStock({})).find((r) => r.productId === productId && r.variantId === variantId);

  it('receives, issues, transfers and corrects after a count', async () => {
    const angle = await productBy((x) => x.modelCode === 'AV-1238');
    const start = await rowOf(angle.id);

    let r = await api.recordStockMovement({ type: 'receive', productId: angle.id, toWarehouseId: 'w-main', quantity: 5 });
    expect(r.balance['w-main']).toBe(start.quantities['w-main'] + 5);

    r = await api.recordStockMovement({ type: 'transfer', productId: angle.id, fromWarehouseId: 'w-main', toWarehouseId: 'w-show', quantity: 3 });
    expect(r.balance['w-show']).toBe(start.quantities['w-show'] + 3);
    expect(r.total).toBe(start.total + 5);

    r = await api.recordStockMovement({ type: 'issue', productId: angle.id, fromWarehouseId: 'w-show', quantity: 1 });
    expect(r.total).toBe(start.total + 4);

    r = await api.recordStockMovement({ type: 'adjust', productId: angle.id, toWarehouseId: 'w-main', countedQuantity: 7 });
    expect(r.balance['w-main']).toBe(7);
    expect(r.movement.delta['w-main']).toBe(7 - (start.quantities['w-main'] + 2));

    const log = await api.listMovements({ limit: 5 });
    expect(log[0].type).toBe('adjust');
    expect(log.slice(0, 4).map((m) => m.type)).toEqual(['adjust', 'issue', 'transfer', 'receive']);
  });

  it('never lets a warehouse go below zero', async () => {
    const angle = await productBy((x) => x.modelCode === 'AV-1238');
    const row = await rowOf(angle.id);
    await expect(
      api.recordStockMovement({ type: 'issue', productId: angle.id, fromWarehouseId: 'w-show', quantity: row.quantities['w-show'] + 1 }),
    ).rejects.toMatchObject({ code: 'notEnoughStock', details: { available: row.quantities['w-show'] } });
  });

  it('validates the movement', async () => {
    const mira = await productBy((x) => x.modelCode === 'MIRA-B');
    await expect(api.recordStockMovement({ type: 'receive', productId: mira.id, toWarehouseId: 'w-main', quantity: 1 })).rejects.toMatchObject({
      code: 'validation',
      details: { fields: { variantId: 'required' } },
    });
    await expect(
      api.recordStockMovement({ type: 'transfer', productId: mira.id, variantId: mira.variants[0].id, fromWarehouseId: 'w-main', toWarehouseId: 'w-main', quantity: 1 }),
    ).rejects.toMatchObject({ code: 'validation', details: { fields: { toWarehouseId: 'sameWarehouse' } } });
    await expect(api.recordStockMovement({ type: 'receive', productId: mira.id, variantId: mira.variants[0].id, toWarehouseId: 'w-main', quantity: 0 })).rejects.toMatchObject({
      code: 'validation',
    });
    const set = await productBy((x) => x.productType === 'bundle');
    await expect(api.recordStockMovement({ type: 'receive', productId: set.id, toWarehouseId: 'w-main', quantity: 1 })).rejects.toMatchObject({
      code: 'bundleHasNoStock',
    });
  });
});

describe('bulk move between categories', () => {
  beforeEach(async () => {
    await api.signIn('owner@demo');
  });

  it('previews exactly what will change, then applies it', async () => {
    const pipes = (await api.adminProducts({ categoryId: 'c-ppr-pipes' })).map((p) => p.id);
    const oneFitting = (await api.adminProducts({ categoryId: 'c-ppr-fittings' }))[0].id;
    const plan = await api.previewBulkMove({ productIds: [...pipes, oneFitting], targetCategoryId: 'c-ppr-fittings' });

    expect(plan.canApply).toBe(true);
    expect(plan.counts).toEqual({ selected: pipes.length + 1, willMove: pipes.length, unchanged: 1 });
    const fittings = plan.affectedCategories.find((a) => a.id === 'c-ppr-fittings');
    const pipeCat = plan.affectedCategories.find((a) => a.id === 'c-ppr-pipes');
    expect(fittings.after - fittings.before).toBe(pipes.length);
    expect(pipeCat.after).toBe(0);
    expect(plan.changes[0].to.path.map((c) => c.slug)).toEqual(['rough-in', 'ppr-fittings']);

    // Nothing changed by the preview itself.
    expect((await api.adminProducts({ categoryId: 'c-ppr-pipes' })).length).toBe(pipes.length);

    const result = await api.applyBulkMove({ productIds: [...pipes, oneFitting], targetCategoryId: 'c-ppr-fittings', token: plan.token });
    expect(result.moved).toBe(pipes.length);
    expect((await api.adminProducts({ categoryId: 'c-ppr-pipes' })).length).toBe(0);
    const activity = await api.listActivity();
    expect(activity[0]).toMatchObject({ type: 'bulkMove', details: { count: pipes.length } });
  });

  it('refuses a category that has sub-categories (products stand on final categories)', async () => {
    const plan = await api.previewBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-valves' });
    expect(plan.canApply).toBe(false);
    expect(plan.blockers.map((b) => b.code)).toContain('targetNotLeaf');
    await expect(api.applyBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-valves', token: plan.token })).rejects.toMatchObject({ code: 'cannotApply' });
  });

  it('refuses to apply a preview the data no longer matches', async () => {
    const plan = await api.previewBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-ppr-fittings' });
    await api.applyBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-drainage', token: (await api.previewBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-drainage' })).token });
    await expect(api.applyBulkMove({ productIds: ['p-001'], targetCategoryId: 'c-ppr-fittings', token: plan.token })).rejects.toMatchObject({ code: 'previewStale' });
  });
});

describe('category tree management', () => {
  beforeEach(async () => {
    await api.signIn('owner@demo');
  });

  it('adds, renames and moves categories', async () => {
    const added = await api.addCategory({ parentId: 'c-valves', nameAr: 'محبس عوامة', nameEn: 'Float valves' });
    expect(added.slug).toBe('float-valves');
    expect((await api.getCategory('float-valves')).path.map((c) => c.slug)).toEqual(['rough-in', 'valves', 'float-valves']);

    const renamed = await api.renameCategory(added.id, { nameAr: 'محبس عوامه', nameEn: 'Float valves', nameDe: 'Schwimmerventile' });
    expect(renamed.name.de).toBe('Schwimmerventile');

    const moved = await api.moveCategory('c-valves', 'c-mixers');
    expect(moved.parentCategoryId).toBe('c-mixers');
    expect((await api.getCategory('float-valves')).path.map((c) => c.slug)).toEqual(['mixers', 'valves', 'float-valves']);
  });

  it('keeps products on final categories and the tree free of loops', async () => {
    await expect(api.addCategory({ parentId: 'c-basin-mixers', nameAr: 'تجربة', nameEn: 'Test' })).rejects.toMatchObject({ code: 'parentHasProducts' });
    await expect(api.moveCategory('c-roughin', 'c-angle-valves')).rejects.toMatchObject({ code: 'moveIntoItself' });
    await expect(api.moveCategory('c-showers', 'c-toilets')).rejects.toMatchObject({ code: 'parentHasProducts' });
    await expect(api.addCategory({ parentId: 'c-valves', nameAr: 'محبس زاويه', nameEn: 'Other' })).rejects.toMatchObject({ code: 'duplicateName' });
    await expect(api.addCategory({ parentId: null, nameAr: '', nameEn: '' })).rejects.toMatchObject({
      code: 'validation',
      details: { fields: { nameAr: 'required', nameEn: 'required' } },
    });
  });
});

describe('persistence', () => {
  it('keeps the data in the given storage and resets to the seed', async () => {
    await api.signIn('owner@demo');
    await api.addCategory({ parentId: null, nameAr: 'قسم تجريبى', nameEn: 'Trial department' });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)).version).toBe(SEED_VERSION);

    const again = createApi({ storage, latency: [0, 0] });
    expect((await again.listCategories()).some((c) => c.slug === 'trial-department')).toBe(true);

    await again.reset();
    expect((await again.listCategories()).some((c) => c.slug === 'trial-department')).toBe(false);
    expect(await again.getSession()).toBeNull();
  });

  it('replaces a stored state from another seed version', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: -1, products: [] }));
    const again = createApi({ storage, latency: [0, 0] });
    expect((await again.listProducts({})).total).toBeGreaterThan(60);
  });
});
