import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useSession } from '../context/SessionContext.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/ui.jsx';

export default function MyOrders() {
  const { t, money, date, number } = useI18n();
  const { user } = useSession();
  const { data, error, loading, reload } = useApi(() => api.listMyOrders(), [user?.email]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl sm:text-3xl">{t('myOrders.title')}</h1>
      {!user && <p className="mt-2 text-sm text-gray-500">{t('myOrders.guestNote')}</p>}
      {data.length === 0 ? (
        <EmptyState title={t('myOrders.empty')}>
          <Link to="/categories" className="btn-primary">
            {t('cart.continue')}
          </Link>
          {!user && (
            <Link to="/signin" className="btn-ghost">
              {t('nav.signIn')}
            </Link>
          )}
        </EmptyState>
      ) : (
        <ul className="mt-6 space-y-4">
          {data.map((order) => (
            <li key={order.id} className="card p-5" data-testid="my-order">
              <div className="flex flex-wrap items-center gap-3">
                <span className="num-ltr font-bold text-gray-900">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
                <span className="text-sm text-gray-500">{date(order.createdAt)}</span>
                <span className="text-sm text-gray-500">· {t('myOrders.itemsCount', { count: number(order.itemCount) })}</span>
                <span className="ms-auto font-semibold text-gray-900">{money(order.totalAmount)}</span>
                <Link to={`/orders/${order.id}`} className="btn-ghost py-1.5">
                  {t('myOrders.view')}
                </Link>
              </div>
              <div className="mt-4">
                <OrderTimeline order={order} showHistory={false} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
