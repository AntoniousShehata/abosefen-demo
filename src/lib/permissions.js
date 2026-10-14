// Demo roles. The fake API checks these the way a server would (a cashier asking to move products is refused
// by the API, not only hidden by the menu); the pages read the same table to decide what to show.

export const PERMISSIONS = {
  products: 'admin.products',
  categories: 'admin.categories',
  stock: 'admin.stock',
  orders: 'admin.orders',
  activity: 'admin.activity',
};

const ALL = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  owner: ALL,
  cashier: [PERMISSIONS.orders],
  customer: [],
};

/** The three demo accounts. No password exists anywhere: signing in only picks a role in this browser. */
export const DEMO_ACCOUNTS = [
  { email: 'owner@demo', role: 'owner', displayName: { ar: 'صاحب المحل (عرض)', en: 'Shop owner (demo)', de: 'Inhaber (Demo)' } },
  { email: 'cashier@demo', role: 'cashier', displayName: { ar: 'الكاشير (عرض)', en: 'Cashier (demo)', de: 'Kasse (Demo)' } },
  { email: 'customer@demo', role: 'customer', displayName: { ar: 'عميل (عرض)', en: 'Customer (demo)', de: 'Kunde (Demo)' } },
];

export function can(user, permission) {
  if (!user) return false;
  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}

export function hasAnyAdmin(user) {
  return ALL.some((p) => can(user, p));
}
