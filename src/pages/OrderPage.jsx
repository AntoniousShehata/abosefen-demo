import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/ui.jsx';
import { errorText } from '../lib/errorText.js';
import { SimulationNotice } from './CheckoutPage.jsx';

export function OrderLines({ order }) {
  const { t, pick, money } = useI18n();
  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2">
            <ProductArt art={item.art} color={item.colorHex} className="h-12 w-12 shrink-0 rounded-lg bg-gray-50 p-1" label={pick(item.productName)} />
            <div className="min-w-0 flex-1">
              <Link to={`/p/${item.slug}`} className="link text-sm font-medium text-gray-800">
                {pick(item.productName)}
              </Link>
              <p className="text-xs text-gray-500">
                {item.variantLabel ? `${pick(item.variantLabel)} · ` : ''}
                <span className="num-ltr">{item.productSku}</span>
              </p>
            </div>
            <span className="num-ltr text-sm text-gray-500">
              {item.quantity} × {money(item.unitPrice)}
            </span>
            <span className="w-24 text-end text-sm font-semibold text-gray-800">{money(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
        {[
          [t('cart.subtotal'), money(order.subtotal)],
          ...(order.discount > 0 ? [[t('cart.discount', { percent: order.discountPercent || 0 }), `− ${money(order.discount)}`]] : []),
          [t('cart.vat'), money(order.vat)],
          [t('cart.shipping'), order.shipping ? money(order.shipping) : t('cart.free')],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-gray-600">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="flex justify-between text-base font-bold text-gray-900">
          <dt>{t('cart.total')}</dt>
          <dd data-testid="order-total">{money(order.totalAmount)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, date, isRtl } = useI18n();
  const { data: order, error, loading, reload } = useApi(() => api.getOrder(id), [id]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  if (loading && !order) return <Loading />;
  if (error) {
    return error.code === 'orderNotFound' ? (
      <EmptyState title={t('order.notFound')}>
        <Link to="/" className="btn-primary">
          {t('order.backToShop')}
        </Link>
      </EmptyState>
    ) : (
      <ErrorState error={error} onRetry={reload} />
    );
  }

  const advance = async () => {
    setBusy(true);
    setProblem('');
    try {
      await api.advanceOrderDemo(order.id);
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {params.get('placed') && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-emerald-800" role="status">
          <p className="font-semibold">{t('order.placed')}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl">
          {t('order.title', { number: order.orderNumber })}
        </h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {t('order.placedOn', { date: date(order.createdAt, true) })} · {t('order.payment')}: {t(`order.paymentStatuses.${order.paymentStatus}`)}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 text-base">{t('order.status')}</h2>
          <OrderTimeline order={order} />
          <div className="mt-5 rounded-lg bg-gray-50 p-3">
            {order.nextDemoStep ? (
              <>
                <button type="button" className="btn-ghost" onClick={advance} disabled={busy} data-testid="simulate-next">
                  {t('order.simulateNext')} {isRtl ? '←' : '→'} {t(`order.statuses.${order.nextDemoStep}`)}
                </button>
                <p className="mt-2 text-xs text-gray-500">{t('order.simulateHint')}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">{t('order.finished')}</p>
            )}
            {problem && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {problem}
              </p>
            )}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-base">{t('order.items')}</h2>
          <OrderLines order={order} />
          <p className="mt-4 text-sm text-gray-600">
            {order.deliveryMethod === 'pickup' ? t('order.pickupAt') : `${t('order.deliverTo')}: ${order.address}${order.governorate ? ` — ${t(`governorates.${order.governorate}`)}` : ''}`}
          </p>
        </section>
      </div>
      <div className="mt-6">
        <SimulationNotice />
      </div>
    </div>
  );
}
