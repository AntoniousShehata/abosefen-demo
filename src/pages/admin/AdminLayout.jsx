import { Link, NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useSession } from '../../context/SessionContext.jsx';
import { PERMISSIONS } from '../../lib/permissions.js';
import { EmptyState, Loading } from '../../components/ui.jsx';

export const ADMIN_NAV = [
  { to: '/admin', end: true, key: 'home', permission: null },
  { to: '/admin/products', key: 'products', permission: PERMISSIONS.products },
  { to: '/admin/categories', key: 'categories', permission: PERMISSIONS.categories },
  { to: '/admin/stock', key: 'stock', permission: PERMISSIONS.stock },
  { to: '/admin/orders', key: 'orders', permission: PERMISSIONS.orders },
];

/** A back-office screen the role may not open: said plainly (the API refuses it too). */
export function RequirePermission({ permission, children }) {
  const { t } = useI18n();
  const { can } = useSession();
  if (!can(permission)) {
    return (
      <EmptyState title={t('admin.noAccess')} text={t('admin.noAccessHint')}>
        <Link to="/signin" className="btn-primary">
          {t('auth.title')}
        </Link>
      </EmptyState>
    );
  }
  return children;
}

export default function AdminLayout() {
  const { t } = useI18n();
  const { user, ready, isStaff, can } = useSession();

  if (!ready) return <Loading />;
  if (!user) {
    return (
      <EmptyState title={t('admin.title')} text={t('admin.signInFirst')}>
        <Link to="/signin" className="btn-primary">
          {t('nav.signIn')}
        </Link>
      </EmptyState>
    );
  }
  if (!isStaff) {
    return (
      <EmptyState title={t('admin.noAccess')} text={t('admin.noAccessHint')}>
        <Link to="/signin" className="btn-primary">
          {t('auth.title')}
        </Link>
      </EmptyState>
    );
  }

  const items = ADMIN_NAV.filter((item) => !item.permission || can(item.permission));
  const linkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
      <aside>
        <div className="card p-3 lg:sticky lg:top-36">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t('admin.title')}</p>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col" aria-label={t('admin.title')}>
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {t(`admin.${item.key}`)}
              </NavLink>
            ))}
          </nav>
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('admin.roleNote', { role: t(`auth.roles.${user.role}`) })}</p>
        </div>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
