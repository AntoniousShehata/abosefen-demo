import { beforeEach, describe, expect, it } from 'vitest';
import { createApi, memoryStorage } from '../src/api/createApi.js';

// Production's PRC-2 «لقيته أرخص؟», the demo's own version: a customer says where they saw a product for less; the
// shop's price is read from the catalogue, a price that is not lower is refused, and the owner's list has the report.
let api;

beforeEach(() => {
  api = createApi({ storage: memoryStorage(), latency: [0, 0] });
});

async function shelves() {
  const { items } = await api.listProducts({});
  const details = await Promise.all(items.map((p) => api.getProduct(p.slug)));
  const plain = details.find((p) => !p.variants.length && !p.bundle);
  const optioned = details.find((p) => p.variants.length > 1);
  return { plain, optioned };
}

const report = (product, extra = {}) =>
  api.sendPriceReport({
    productId: product.id,
    place: 'A shop in Faisal',
    price: Math.floor(product.pricing.salePrice * 0.9),
    link: 'https://example.com/the-same-product',
    name: 'Sara',
    mobile: '0101 234 5678',
    ...extra,
  });

describe('«Found it cheaper?»', () => {
  it('takes a lower price with its link, and keeps the price the page showed', async () => {
    const { plain } = await shelves();
    const { id } = await report(plain);

    await api.signIn('owner@demo');
    const [row] = await api.adminPriceReports();
    expect(row).toMatchObject({
      id,
      ourPrice: plain.pricing.salePrice,
      theirPrice: Math.floor(plain.pricing.salePrice * 0.9),
      place: 'A shop in Faisal',
      mobile: '01012345678',
      state: 'new',
      sku: plain.sku,
    });
  });

  it('refuses a price that is not lower, and what it cannot read', async () => {
    const { plain, optioned } = await shelves();

    await expect(report(plain, { price: plain.pricing.salePrice })).rejects.toMatchObject({ code: 'notCheaper' });
    await expect(report(plain, { place: '', price: 'abc', link: 'example.com', name: ' ', mobile: '12' })).rejects.toMatchObject({
      code: 'validation',
      details: { fields: { place: 'required', price: 'invalid', link: 'invalid', name: 'required', mobile: 'invalid' } },
    });
    await expect(report(optioned)).rejects.toMatchObject({ details: { fields: { variantId: 'required' } } });
  });

  it('reads an option at its own price', async () => {
    const { optioned } = await shelves();
    const option = [...optioned.variants].sort((a, b) => b.pricing.salePrice - a.pricing.salePrice)[0];

    await api.sendPriceReport({
      productId: optioned.id,
      variantId: option.id,
      place: 'Online',
      price: option.pricing.salePrice - 1,
      link: 'https://example.com/offer',
      name: 'Omar',
      mobile: '01112345678',
    });
    await api.signIn('owner@demo');
    expect((await api.adminPriceReports())[0]).toMatchObject({ unit: option.id, ourPrice: option.pricing.salePrice });
  });

  it('is the owner team’s list: answered and taken back', async () => {
    const { plain } = await shelves();
    const { id } = await report(plain);

    await api.signIn('customer@demo');
    await expect(api.adminPriceReports()).rejects.toMatchObject({ status: 403 });

    await api.signIn('owner@demo');
    expect(await api.markPriceReportAnswered(id)).toEqual({ id, state: 'answered' });
    expect((await api.adminPriceReports())[0].answeredBy).toBe('owner@demo');
    expect(await api.markPriceReportAnswered(id, false)).toEqual({ id, state: 'new' });
    await expect(api.markPriceReportAnswered('cheaper-404')).rejects.toMatchObject({ code: 'reportNotFound' });
  });
});
