import { describe, expect, it } from 'vitest';
import { computeTotals, lineTotal, VAT_RATE } from '../src/lib/money.js';

describe('money rules', () => {
  it('charges VAT 14 % on the subtotal', () => {
    const t = computeTotals([{ price: 1000, quantity: 1 }]);
    expect(VAT_RATE).toBe(0.14);
    expect(t.subtotal).toBe(1000);
    expect(t.vat).toBe(140);
    expect(t.total).toBe(1140);
  });

  it('charges VAT on (subtotal − discount), and adds delivery after VAT', () => {
    const t = computeTotals(
      [
        { price: 450, quantity: 2 },
        { price: 100, quantity: 1 },
      ],
      { discountPercent: 10, shipping: 150 },
    );
    expect(t.subtotal).toBe(1000);
    expect(t.discount).toBe(100);
    expect(t.taxable).toBe(900);
    expect(t.vat).toBe(126);
    expect(t.shipping).toBe(150);
    expect(t.total).toBe(1176);
    expect(t.itemCount).toBe(3);
  });

  it('adds piasters exactly (no floating-point drift)', () => {
    const t = computeTotals([{ price: 0.1, quantity: 3 }, { price: 0.2, quantity: 1 }]);
    expect(t.subtotal).toBe(0.5);
    expect(t.vat).toBe(0.07);
    expect(t.total).toBe(0.57);
    expect(lineTotal(19.99, 3)).toBe(59.97);
  });

  it('treats an empty cart as zero', () => {
    expect(computeTotals([])).toMatchObject({ subtotal: 0, vat: 0, total: 0, itemCount: 0 });
  });
});
