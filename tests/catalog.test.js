import { describe, expect, it } from 'vitest';
import { BRANDS, CATEGORIES, PRODUCTS } from '../src/data/catalog.js';

// Guards on the synthetic data: big enough to feel real, never borrowing a real maker's name.
const REAL_MAKERS = ['grohe', 'duravit', 'ideal standard', 'hansgrohe', 'roca', 'geberit', 'kohler', 'villeroy', 'jacob delafon', 'franke', 'blanco', 'teka', 'toto', 'american standard', 'cleopatra', 'lecico', 'duravit', 'hansa', 'kludi', 'gessi'];

describe('synthetic catalogue', () => {
  it('has a realistic size: 60–90 products', () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(60);
    expect(PRODUCTS.length).toBeLessThanOrEqual(90);
  });

  it('uses invented brands only', () => {
    expect(BRANDS.length).toBeGreaterThanOrEqual(5);
    const text = JSON.stringify([BRANDS, PRODUCTS]).toLowerCase();
    for (const maker of REAL_MAKERS) expect(text, maker).not.toContain(maker);
  });

  it('puts every product on a final category (one without sub-categories)', () => {
    const parents = new Set(CATEGORIES.map((c) => c.parentCategoryId).filter(Boolean));
    for (const p of PRODUCTS) {
      expect(CATEGORIES.some((c) => c.id === p.categoryId), p.sku).toBe(true);
      expect(parents.has(p.categoryId), p.sku).toBe(false);
    }
  });

  it('has unique ids, SKUs, slugs and variant SKUs', () => {
    const unique = (list) => new Set(list).size === list.length;
    expect(unique(PRODUCTS.map((p) => p.id))).toBe(true);
    expect(unique(PRODUCTS.map((p) => p.sku))).toBe(true);
    expect(unique(PRODUCTS.map((p) => p.slug))).toBe(true);
    expect(unique(PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku)))).toBe(true);
    expect(unique(CATEGORIES.map((c) => c.slug))).toBe(true);
  });

  it('names everything in Arabic, English and German', () => {
    for (const p of PRODUCTS) {
      expect(p.nameAr && p.name && p.nameDe, p.sku).toBeTruthy();
      expect(/[؀-ۿ]/.test(p.nameAr), p.sku).toBe(true);
    }
    for (const c of CATEGORIES) expect(c.nameAr && c.name && c.nameDe, c.id).toBeTruthy();
  });

  it('has variants by finish and by size, and a few sets', () => {
    expect(PRODUCTS.some((p) => p.variants.some((v) => v.colorCode))).toBe(true);
    expect(PRODUCTS.some((p) => p.variants.some((v) => v.sizeCode))).toBe(true);
    expect(PRODUCTS.some((p) => p.variants.some((v) => v.colorCode && v.sizeCode))).toBe(true);
    expect(PRODUCTS.filter((p) => p.productType === 'bundle').length).toBeGreaterThanOrEqual(2);
  });

  it('carries no picture address (the demo draws its own)', () => {
    const text = JSON.stringify(PRODUCTS);
    expect(text).not.toMatch(/\.(jpe?g|png|webp|gif)\b/i);
    expect(text).not.toMatch(/https?:\/\//i);
  });
});
