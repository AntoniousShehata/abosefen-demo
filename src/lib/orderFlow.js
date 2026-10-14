// Order statuses and the steps between them. The names are the production shop's status names (a subset —
// see contracts/shapes.json); the customer sees four plain stages, as in the shop's own order tracker.

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Packed',
  'Shipped',
  'Delivered',
  'Completed',
  'Cancelled',
  'Returned',
];

/** Which status may follow which (the back office offers only these). */
export const NEXT_STATUSES = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: ['Completed', 'Returned'],
  Completed: [],
  Cancelled: [],
  Returned: [],
};

/** The happy path, used by «simulate the next step» on the customer's order page. */
export const HAPPY_PATH = ['Pending', 'Confirmed', 'Preparing', 'Packed', 'Shipped', 'Delivered', 'Completed'];

/** Statuses that put the goods back on the shelf. */
export const RESTOCKING_STATUSES = ['Cancelled', 'Returned'];

export const STAGES = ['confirmed', 'preparing', 'shipped', 'delivered'];

export const STATUS_STAGE = {
  Pending: -1,
  Confirmed: 0,
  Preparing: 1,
  Packed: 1,
  Shipped: 2,
  Delivered: 3,
  Completed: 3,
};

export const isOpenStatus = (status) => !['Completed', 'Cancelled', 'Returned', 'Delivered'].includes(status);

export function canMove(from, to) {
  return (NEXT_STATUSES[from] || []).includes(to);
}

export function nextOnHappyPath(status) {
  const i = HAPPY_PATH.indexOf(status);
  return i >= 0 && i < HAPPY_PATH.length - 1 ? HAPPY_PATH[i + 1] : null;
}
