import { beforeEach, describe, expect, it } from 'vitest';
import { createApi, memoryStorage } from '../src/api/createApi.js';

// Production's rule that an order is never deducted twice, held on the demo's own checkout: it takes the stock when the
// order is placed, and the cart it empties leaves a second press nothing to place.
let api;

beforeEach(() => {
  api = createApi({ storage: memoryStorage(), latency: [0, 0] });
});

const valve = async () => {
  const { items } = await api.listProducts({});
  return items.find((p) => p.modelCode === 'AV-1238');
};
const buyer = { name: 'Test', phone: '0100 000 0000', deliveryMethod: 'delivery', governorate: 'cairo', address: 'Demo street 1', paymentMethod: 'cash' };

describe('an order takes its stock once', () => {
  it('two presses at the same moment make one order and one deduction', async () => {
    const product = await valve();
    const before = product.inventory.stockQuantity;
    await api.addToCart({ productId: product.id, quantity: 2 });

    const answers = await Promise.allSettled([api.placeOrder(buyer), api.placeOrder(buyer)]);

    expect(answers.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    expect(answers.find((a) => a.status === 'rejected').reason.code).toBe('cartEmpty');
    expect((await valve()).inventory.stockQuantity).toBe(before - 2);
    await api.signIn('owner@demo');
    expect((await api.listMovements({ limit: 50 })).filter((m) => m.type === 'sale')).toHaveLength(1);
  });

  it('a cancelled order gives its stock back once', async () => {
    const product = await valve();
    const before = product.inventory.stockQuantity;
    await api.addToCart({ productId: product.id, quantity: 2 });
    const order = await api.placeOrder(buyer);

    await api.signIn('owner@demo');
    const answers = await Promise.allSettled([api.changeOrderStatus(order.id, 'Cancelled'), api.changeOrderStatus(order.id, 'Cancelled')]);

    expect(answers.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    expect((await valve()).inventory.stockQuantity).toBe(before);
  });
});
