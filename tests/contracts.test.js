import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import contract from '../contracts/shapes.json';
import { createApi, memoryStorage } from '../src/api/createApi.js';
import { ORDER_STATUSES, STAGES } from '../src/lib/orderFlow.js';

// The demo side of the contract: whatever contracts/shapes.json says the demo SERVES must really be in the fake
// API's answers. (scripts/check-contracts.mjs watches the production side.)

const resolvePath = (obj, path) => path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), obj);
const servedBy = (samples, path) => samples.some((s) => resolvePath(s, path) !== undefined);

let api;
beforeEach(async () => {
  api = createApi({ storage: memoryStorage(), latency: [0, 0] });
});

describe('contracts/shapes.json', () => {
  it('is versioned and names its production snapshot', () => {
    expect(contract.contractVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.snapshot.commit).not.toBe('none');
    for (const [name, shape] of Object.entries(contract.shapes)) {
      expect(Array.isArray(shape.productionUses), name).toBe(true);
      expect(shape.productionUses.length, name).toBeGreaterThan(0);
    }
  });

  it('product: every field the demo promises is served', async () => {
    const { items } = await api.listProducts({});
    const withOptions = await api.getProduct(items.find((p) => p.variants.length > 1).slug);
    const set = await api.getProduct(items.find((p) => p.productType === 'bundle').slug);
    for (const path of contract.shapes.product.demoProvides) expect(servedBy([withOptions, set], path), path).toBe(true);
  });

  it('variant: every field the demo promises is served', async () => {
    const { items } = await api.listProducts({});
    const variants = items.flatMap((p) => p.variants);
    for (const path of contract.shapes.variant.demoProvides) expect(servedBy(variants, path), path).toBe(true);
  });

  it('category: every field the demo promises is served', async () => {
    const list = await api.listCategories();
    const { category } = await api.getCategory('valves');
    for (const path of contract.shapes.category.demoProvides) expect(servedBy([...list, category], path), path).toBe(true);
  });

  it('cart line: every field the demo promises is served', async () => {
    const { items } = await api.listProducts({});
    const simple = items.find((p) => !p.variants.length && p.inventory.stockQuantity > 0);
    const cart = await api.addToCart({ productId: simple.id, quantity: 1 });
    for (const path of contract.shapes.cartLine.demoProvides) expect(servedBy(cart.lines, path), path).toBe(true);
  });

  it('order: every field the demo promises is served', async () => {
    await api.signIn('owner@demo');
    const { items } = await api.adminOrders({});
    for (const path of contract.shapes.order.demoProvides) expect(servedBy(items, path), path).toBe(true);
  });

  it('order statuses and stages match the demo’s order road', () => {
    for (const s of contract.shapes.orderStatus.demoProvides) expect(ORDER_STATUSES).toContain(s);
    expect([...contract.shapes.orderStages.demoProvides].sort()).toEqual([...STAGES].sort());
    expect([...contract.shapes.orderStages.productionUses].sort()).toEqual([...STAGES].sort());
  });

  it('design tokens and fonts are the production ones', () => {
    const css = readFileSync(join(__dirname, '..', 'src', 'index.css'), 'utf8').replace(/\s+/g, ' ');
    for (const token of contract.shapes.designTokens.productionUses) expect(css, token).toContain(token.replace(/\s+/g, ' '));
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    for (const family of contract.shapes.fonts.productionUses) expect(html, family).toContain(`family=${family}`);
  });
});
