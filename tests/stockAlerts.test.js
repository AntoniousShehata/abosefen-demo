import { beforeEach, describe, expect, it } from 'vitest';
import { createApi, memoryStorage } from '../src/api/createApi.js';

// Production's STK-13 «بلّغنى لما يتوفر», the demo's own version: a customer asks on an option that is out of stock;
// the moment a stock movement brings that option back, the request is told, once, and the owner's list has it.
let api;

beforeEach(() => {
  api = createApi({ storage: memoryStorage(), latency: [0, 0] });
});

/** An option with nothing to sell, and one with some. */
async function shelves() {
  const { items } = await api.listProducts({});
  const details = await Promise.all(items.map((p) => api.getProduct(p.slug)));
  const unit = (wanted) => {
    const product = details.find((p) => p.variants.some(wanted));
    return { product, variant: product.variants.find(wanted) };
  };
  return { out: unit((v) => v.stockQuantity === 0), onSale: unit((v) => v.stockQuantity > 0) };
}

const ask = ({ product, variant }, who = {}) =>
  api.askStockAlert({ productId: product.id, variantId: variant.id, name: 'Sara', mobile: '01012345678', ...who });

const receive = ({ product, variant }, quantity = 2) =>
  api.recordStockMovement({ type: 'receive', productId: product.id, variantId: variant.id, toWarehouseId: 'w-main', quantity });

describe('«Notify me when it is back»', () => {
  it('takes one request per mobile on an option with nothing to sell, and refuses what it cannot take', async () => {
    const { out, onSale } = await shelves();

    const first = await ask(out, { mobile: '0101 234 5678' });
    const again = await ask(out, { name: 'Sara A.' });
    expect(again.id).toBe(first.id);

    await expect(ask(onSale)).rejects.toMatchObject({ code: 'inStockNow' });
    await expect(ask(out, { name: '', mobile: '123' })).rejects.toMatchObject({
      code: 'validation',
      details: { fields: { name: 'required', mobile: 'invalid' } },
    });
  });

  it('tells the request the moment a receipt brings the option back — and only then', async () => {
    const { out } = await shelves();
    await ask(out);
    await api.signIn('owner@demo');

    expect((await api.adminStockAlerts())[0]).toMatchObject({ state: 'waiting', sku: out.variant.sku });
    await receive(out);
    const [told] = await api.adminStockAlerts();
    expect(told).toMatchObject({ state: 'arrived', name: 'Sara', mobile: '01012345678', product: expect.objectContaining({ en: out.product.name.en }) });

    await receive(out);
    expect((await api.adminStockAlerts())[0].arrivedAt).toBe(told.arrivedAt);
  });

  it('lets the owner mark his WhatsApp sent and take it back; a waiting request has nothing to send', async () => {
    const { out } = await shelves();
    const { id } = await ask(out);
    await api.signIn('owner@demo');

    await expect(api.markStockAlertMessaged(id)).rejects.toMatchObject({ code: 'alertNotFound' });
    await receive(out);
    expect(await api.markStockAlertMessaged(id)).toEqual({ id, state: 'messaged' });
    expect(await api.markStockAlertMessaged(id, false)).toEqual({ id, state: 'arrived' });
  });

  it('is the owner team’s list, and a customer can take his own request back', async () => {
    const { out } = await shelves();
    const { id } = await ask(out);

    await api.signIn('customer@demo');
    await expect(api.adminStockAlerts()).rejects.toMatchObject({ status: 403 });

    expect(await api.cancelStockAlert(id)).toBe(true);
    await api.signIn('owner@demo');
    expect(await api.adminStockAlerts()).toEqual([]);
  });
});
