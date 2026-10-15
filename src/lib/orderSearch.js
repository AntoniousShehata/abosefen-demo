// What the back office finds an order by — the demo's own version of production's SRCH-11 («search at every level»):
// everything a worker knows of it. The number typed with or without its dashes («demo1003»), the customer's name, the
// phone typed any way (0100…, +20 100…, with or without spaces), the e-mail, the governorate, and each line's product
// by its name TODAY in Arabic, English and German and by its code — the line keeps the name it was sold under, the
// catalogue may have renamed it since.

/** A code or a number as one run of letters and digits: «DEMO-1003» → «DEMO1003», «0100 000 0002» → «01000000002». */
export const compact = (text) => String(text ?? '').replace(/[\s\-_/.]+/g, '');

/** An Egyptian phone in the ways it is typed: as kept, its digits alone, and with the country code. */
export function phoneForms(phone) {
  const digits = compact(phone).replace(/^\+/, '');
  if (!digits) return [];
  const local = digits.startsWith('20') && digits.length === 12 ? `0${digits.slice(2)}` : digits;
  const international = local.startsWith('0') ? `+20${local.slice(1)}` : `+${digits}`;
  return [String(phone), local, international, international.slice(1)];
}

/**
 * The texts an order is found by.
 * @param order     the order as the back office keeps it (orderNumber, customerName, phone, customerEmail, governorate, items)
 * @param products  the catalogue as it is now — a line's product is read by its id
 */
export function orderSearchFields(order, products = []) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = (order.items || []).flatMap((line) => {
    const now = byId.get(line.productId);
    const variant = now?.variants?.find((v) => v.id === line.variantId);
    return [
      line.productName?.ar, line.productName?.en, line.productName?.de, line.productSku, compact(line.productSku),
      now?.nameAr, now?.name, now?.nameDe, now?.sku, now?.modelCode, variant?.sku, compact(variant?.sku),
    ];
  });
  return [
    order.orderNumber, compact(order.orderNumber),
    order.customerName, ...phoneForms(order.phone), order.customerEmail, order.governorate,
    ...lines,
  ].filter(Boolean);
}
