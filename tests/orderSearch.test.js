import { describe, expect, it } from 'vitest';
import { compact, orderSearchFields, phoneForms } from '../src/lib/orderSearch.js';

describe('what the back office finds an order by (as production SRCH-11)', () => {
  it('runs a code or a number together', () => {
    expect(compact('DEMO-1003')).toBe('DEMO1003');
    expect(compact('0100 000 0002')).toBe('01000000002');
  });

  it('reads an Egyptian phone in the ways it is typed', () => {
    expect(phoneForms('0100 000 0002')).toEqual(['0100 000 0002', '01000000002', '+201000000002', '201000000002']);
    expect(phoneForms('+20 100 000 0002')).toContain('01000000002');
    expect(phoneForms('')).toEqual([]);
  });

  it("finds a line's product by its name of today, though the line keeps the old one", () => {
    const order = {
      orderNumber: 'DEMO-1', customerName: 'x', phone: '0100 000 0009',
      items: [{ productId: 'p-1', productName: { ar: 'اسم قديم', en: 'Old name', de: 'Alter Name' }, productSku: 'OLD-1' }],
    };
    const fields = orderSearchFields(order, [{ id: 'p-1', nameAr: 'اسم جديد', name: 'New name', nameDe: 'Neuer Name', sku: 'NEW-1' }]);
    expect(fields).toEqual(expect.arrayContaining(['DEMO1', 'Old name', 'New name', 'Neuer Name', 'NEW-1', 'OLD1', '+201000000009']));
  });
});
