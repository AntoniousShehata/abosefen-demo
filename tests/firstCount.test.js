import { beforeEach, describe, expect, it } from 'vitest';
import { createApi, memoryStorage } from '../src/api/createApi.js';

// Production's STK-9, the demo's own version: a product no count has reached sells even past the shelves and is owed;
// after its first count it never sells past its stock.
let api;

beforeEach(() => {
  api = createApi({ storage: memoryStorage(), latency: [0, 0] });
});

const byModel = async (model) => {
  const { items } = await api.listProducts({});
  return api.getProduct(items.find((p) => p.modelCode === model).slug);
};
const stockRow = async (productId, variantId = null) =>
  (await api.adminStock({})).find((r) => r.productId === productId && r.variantId === variantId);
const buyer = { name: 'Test', phone: '0100 000 0000', deliveryMethod: 'delivery', governorate: 'cairo', address: 'Demo street 1', paymentMethod: 'cash' };

describe('a product no count has reached', () => {
  it('says so to the customer and sells past its shelves, which then read below zero in the back office only', async () => {
    const mixer = await byModel('DUNA-K');
    expect(mixer.inventory).toMatchObject({ neverCounted: true, stockQuantity: 2 });

    await api.addToCart({ productId: mixer.id, quantity: 5 });
    await api.placeOrder(buyer);

    const after = await byModel('DUNA-K');
    expect(after.inventory).toMatchObject({ neverCounted: true, stockQuantity: 0, inStock: true });

    await api.signIn('owner@demo');
    const row = await stockRow(mixer.id);
    expect(row).toMatchObject({ neverCounted: true, total: -3, isOut: true });
    expect((await api.listMovements({ limit: 1 }))[0]).toMatchObject({ type: 'sale', quantity: 5 });
    expect((await api.adminSummary()).outOfStock).toBeGreaterThan(0);
  });

  it('sells an option with nothing on the shelf, and the other options do not lose what they hold', async () => {
    const sink = await byModel('G2');
    const empty = sink.variants.find((v) => v.stockQuantity === 0);
    const held = sink.variants.find((v) => v.stockQuantity > 0);
    expect(empty.inStock).toBe(true);

    const cart = await api.addToCart({ productId: sink.id, variantId: empty.id, quantity: 2 });
    expect(cart.lines[0].inStock).toBe(true);
    await api.placeOrder(buyer);

    const after = await byModel('G2');
    expect(after.inventory.stockQuantity).toBe(held.stockQuantity);
    expect(after.variants.find((v) => v.id === empty.id).stockQuantity).toBe(0);
  });

  it('a later receipt pays back what was owed', async () => {
    const mixer = await byModel('DUNA-K');
    await api.addToCart({ productId: mixer.id, quantity: 5 });
    await api.placeOrder(buyer);
    await api.signIn('owner@demo');
    const { total } = await api.recordStockMovement({ type: 'receive', productId: mixer.id, toWarehouseId: 'w-main', quantity: 10 });
    expect(total).toBe(7);
  });
});

describe('after the first count', () => {
  it('a count that finds what the system says still counts, once', async () => {
    const mixer = await byModel('DUNA-K');
    await api.signIn('owner@demo');
    const row = await stockRow(mixer.id);

    const first = { type: 'adjust', productId: mixer.id, toWarehouseId: 'w-show', countedQuantity: row.quantities['w-show'] };
    const { movement } = await api.recordStockMovement(first);
    expect(movement.delta['w-show']).toBe(0);
    expect((await stockRow(mixer.id)).neverCounted).toBe(false);

    await expect(api.recordStockMovement(first)).rejects.toMatchObject({ code: 'noChange' });
  });

  it('the product never sells past its stock, in the cart or at the order', async () => {
    const mixer = await byModel('DUNA-K');
    await api.addToCart({ productId: mixer.id, quantity: 4 });

    await api.signIn('owner@demo');
    await api.recordStockMovement({ type: 'adjust', productId: mixer.id, toWarehouseId: 'w-show', countedQuantity: 2 });

    expect((await byModel('DUNA-K')).inventory).toMatchObject({ neverCounted: false, inStock: true, stockQuantity: 2 });
    expect((await api.getCart()).lines[0].inStock).toBe(false);
    await expect(api.placeOrder(buyer)).rejects.toMatchObject({ code: 'outOfStock' });
    await expect(api.updateCartLine(mixer.id, 5)).rejects.toMatchObject({ code: 'outOfStock' });
    await api.updateCartLine(mixer.id, 0);
    await expect(api.addToCart({ productId: mixer.id, quantity: 3 })).rejects.toMatchObject({ code: 'outOfStock', details: { available: 2 } });
  });

  it('one counted option makes the whole product keep to its stock', async () => {
    const sink = await byModel('G2');
    const empty = sink.variants.find((v) => v.stockQuantity === 0);
    const held = sink.variants.find((v) => v.stockQuantity > 0);
    await api.signIn('owner@demo');
    await api.recordStockMovement({ type: 'adjust', productId: sink.id, variantId: held.id, toWarehouseId: 'w-main', countedQuantity: 1 });

    const after = await byModel('G2');
    expect(after.inventory.neverCounted).toBe(false);
    expect(after.variants.find((v) => v.id === empty.id).inStock).toBe(false);
    await expect(api.addToCart({ productId: sink.id, variantId: empty.id, quantity: 1 })).rejects.toMatchObject({ code: 'outOfStock' });
  });

  it('a product already counted stays as it was: refused, and never below zero', async () => {
    const valve = await byModel('AV-1238');
    expect(valve.inventory.neverCounted).toBe(false);
    await expect(api.addToCart({ productId: valve.id, quantity: valve.inventory.stockQuantity + 1 })).rejects.toMatchObject({ code: 'outOfStock' });
  });
});
