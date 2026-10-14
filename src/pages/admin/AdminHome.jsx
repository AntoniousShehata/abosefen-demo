import { Link } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useSession } from '../../context/SessionContext.jsx';
import { PERMISSIONS } from '../../lib/permissions.js';
import { ErrorState, Loading } from '../../components/ui.jsx';

export const pathText = (pick, path) => (path || []).map((c) => pick(c.name)).join(' / ');

export function activityText(t, pick, entry) {
  const d = entry.details || {};
  const vars = { ...d };
  if (entry.type === 'bulkMove') vars.target = pathText(pick, d.target);
  if (entry.type === 'categoryAdd') vars.path = pathText(pick, d.path);
  if (entry.type === 'categoryRename') Object.assign(vars, { before: pick(d.before), after: pick(d.after) });
  if (entry.type === 'categoryMove') Object.assign(vars, { before: pathText(pick, d.before), after: pathText(pick, d.after) });
  if (entry.type === 'stockMovement') vars.type = t(`admin.stockPage.types.${d.type}`);
  if (entry.type === 'orderStatus') Object.assign(vars, { from: t(`order.statuses.${d.from}`), to: t(`order.statuses.${d.to}`) });
  return t(`admin.activityTypes.${entry.type}`, vars);
}

function Card({ label, value, to, tone = 'primary' }) {
  const tones = {
    primary: 'from-primary/10 text-primary',
    amber: 'from-amber-100 text-amber-800',
    gray: 'from-gray-100 text-gray-700',
    secondary: 'from-secondary/10 text-secondary',
  };
  return (
    <Link to={to} className={`card bg-gradient-to-br to-white p-4 transition-shadow hover:shadow-md ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </Link>
  );
}

export default function AdminHome() {
  const { t, pick, number, money, date } = useI18n();
  const { can } = useSession();
  const summary = useApi(() => api.adminSummary(), []);
  const activity = useApi(() => (can(PERMISSIONS.activity) ? api.listActivity({ limit: 15 }) : Promise.resolve(null)), []);

  if (summary.loading && !summary.data) return <Loading />;
  if (summary.error) return <ErrorState error={summary.error} onRetry={summary.reload} />;
  const s = summary.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">{t('admin.home')}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {s.products !== undefined && <Card label={t('admin.cards.products')} value={number(s.products)} to="/admin/products" />}
        {s.categories !== undefined && <Card label={t('admin.cards.categories')} value={number(s.categories)} to="/admin/categories" />}
        {s.lowStock !== undefined && <Card label={t('admin.cards.lowStock')} value={number(s.lowStock)} to="/admin/stock" tone="amber" />}
        {s.outOfStock !== undefined && <Card label={t('admin.cards.outOfStock')} value={number(s.outOfStock)} to="/admin/stock" tone="gray" />}
        {s.openOrders !== undefined && <Card label={t('admin.cards.openOrders')} value={number(s.openOrders)} to="/admin/orders" tone="secondary" />}
        {s.salesTotal !== undefined && <Card label={t('admin.cards.salesTotal')} value={money(s.salesTotal)} to="/admin/orders" tone="secondary" />}
      </div>

      {can(PERMISSIONS.activity) && (
        <section className="card p-5">
          <h2 className="mb-3 text-base">{t('admin.activity')}</h2>
          {activity.data && activity.data.length ? (
            <ul className="divide-y divide-gray-100" data-testid="activity-list">
              {activity.data.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="text-gray-800">{activityText(t, pick, entry)}</span>
                  <span className="ms-auto text-xs text-gray-400">
                    <span className="num-ltr">{entry.by}</span> · {date(entry.at, true)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">{t('admin.activityEmpty')}</p>
          )}
        </section>
      )}
    </div>
  );
}
