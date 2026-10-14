// Money rules of the demo — the same rule the shop's invoices follow:
//   VAT 14 % is charged on (subtotal − discount); delivery is added after VAT.
// Amounts are kept in piasters (1/100 EGP) while adding up, so no floating-point cents go astray.

export const VAT_RATE = 0.14;
export const CURRENCY = 'EGP';

const toPiasters = (egp) => Math.round(Number(egp || 0) * 100);
const toPounds = (piasters) => piasters / 100;

/** The price of one line: unit price × quantity. */
export function lineTotal(unitPrice, quantity) {
  return toPounds(toPiasters(unitPrice) * Math.max(0, Math.trunc(quantity || 0)));
}

/**
 * The totals of a cart or an order.
 * @param {{price:number, quantity:number}[]} lines
 * @param {{discountPercent?:number, shipping?:number}} options
 */
export function computeTotals(lines, { discountPercent = 0, shipping = 0 } = {}) {
  const subtotalP = (lines || []).reduce((sum, l) => sum + toPiasters(l.price) * Math.max(0, Math.trunc(l.quantity || 0)), 0);
  const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountP = Math.round((subtotalP * percent) / 100);
  const taxableP = subtotalP - discountP;
  const vatP = Math.round(taxableP * VAT_RATE);
  const shippingP = toPiasters(shipping);
  return {
    itemCount: (lines || []).reduce((n, l) => n + Math.max(0, Math.trunc(l.quantity || 0)), 0),
    subtotal: toPounds(subtotalP),
    discountPercent: percent,
    discount: toPounds(discountP),
    taxable: toPounds(taxableP),
    vatRate: VAT_RATE,
    vat: toPounds(vatP),
    shipping: toPounds(shippingP),
    total: toPounds(taxableP + vatP + shippingP),
    currency: CURRENCY,
  };
}

/** Rounds a price to whole pounds (catalogue prices in the demo are whole). */
export const roundPrice = (egp) => Math.round(Number(egp || 0));
