import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { EmptyState, ErrorState, Loading, QuantityStepper } from '../components/ui.jsx';
import { errorText } from '../lib/errorText.js';

export function TotalsTable({ totals, showShipping = false }) {
  const { t, money } = useI18n();
  const row = (label, value, strong = false, testId) => (
    <div className={`flex justify-between gap-4 py-1 ${strong ? 'text-base font-bold text-gray-900' : 'text-sm text-gray-600'}`}>
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  );
  return (
    <dl className="divide-y divide-gray-100">
      {row(t('cart.subtotal'), money(totals.subtotal), false, 'totals-subtotal')}
      {totals.discount > 0 && row(t('cart.discount', { percent: totals.discountPercent }), `− ${money(totals.discount)}`, false, 'totals-discount')}
      {totals.discount > 0 && row(t('cart.taxable'), money(totals.taxable))}
      {row(t('cart.vat'), money(totals.vat), false, 'totals-vat')}
      {showShipping
        ? row(t('cart.shipping'), totals.shipping ? money(totals.shipping) : t('cart.free'), false, 'totals-shipping')
        : <p className="py-1 text-xs text-gray-400">{t('cart.shippingAtCheckout')}</p>}
      {row(t('cart.total'), money(totals.total), true, 'totals-total')}
    </dl>
  );
}

export default function CartPage() {
  const { t, pick, money } = useI18n();
  const toast = useToast();
  const { data: cart, error, loading, reload } = useApi(() => api.getCart(), []);
  const [coupon, setCoupon] = useState('');
  const [problem, setProblem] = useState('');
  const [busyLine, setBusyLine] = useState(null);

  if (loading && !cart) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  if (!cart.lines.length) {
    return (
      <EmptyState title={t('cart.empty')}>
        <Link to="/categories" className="btn-primary">
          {t('cart.continue')}
        </Link>
      </EmptyState>
    );
  }

  const run = async (lineKey, fn) => {
    setBusyLine(lineKey);
    setProblem('');
    try {
      await fn();
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusyLine(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl sm:text-3xl">{t('cart.title')}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ul className="card divide-y divide-gray-100">
          {cart.lines.map((line) => (
            <li key={line.lineKey} className="flex gap-3 p-4 sm:gap-4" data-testid="cart-line">
              <Link to={`/p/${line.slug}`} className="shrink-0">
                <ProductArt art={line.art} className="h-20 w-20 rounded-lg bg-gray-50 p-1 sm:h-24 sm:w-24" label={pick(line.name)} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/p/${line.slug}`} className="font-semibold text-gray-900 hover:text-primary">
                      {pick(line.name)}
                    </Link>
                    {line.variantLabel && <p className="text-sm text-gray-500">{pick(line.variantLabel)}</p>}
                    <p className="num-ltr text-xs text-gray-400">{line.sku}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-gray-900">{money(line.lineTotal)}</p>
                    <p className="text-xs text-gray-500">
                      {t('cart.each', { price: money(line.price) })}
                      {line.isOnSale && <span className="ms-1 line-through">{money(line.originalPrice)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    disabled={busyLine === line.lineKey}
                    onChange={(q) => run(line.lineKey, () => api.updateCartLine(line.lineKey, q))}
                  />
                  <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => run(line.lineKey, () => api.removeCartLine(line.lineKey))}>
                    {t('cart.remove')}
                  </button>
                  {!line.inStock && <span className="badge bg-red-50 text-red-700">{t('cart.notEnough', { count: line.stockQuantity })}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-3 text-base">{t('cart.summary')}</h2>
            <TotalsTable totals={cart.totals} />
            <Link to="/checkout" className="btn-primary mt-4 w-full py-2.5" data-testid="go-checkout">
              {t('cart.checkout')}
            </Link>
          </div>
          <form
            className="card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run('coupon', async () => {
                const next = await api.applyCoupon(coupon);
                if (next.couponCode) toast.show(t('cart.couponApplied', { code: next.couponCode }));
                setCoupon('');
              });
            }}
          >
            <label className="label" htmlFor="coupon">
              {t('cart.coupon')}
            </label>
            {cart.couponCode ? (
              <div className="flex items-center justify-between gap-2">
                <span className="badge bg-emerald-50 font-mono text-emerald-700">{cart.couponCode}</span>
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => run('coupon', () => api.applyCoupon(''))}>
                  {t('cart.removeCoupon')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input id="coupon" className="input uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t('cart.couponPlaceholder')} />
                <button type="submit" className="btn-ghost" disabled={!coupon.trim()}>
                  {t('cart.apply')}
                </button>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">{t('cart.couponHint')}</p>
          </form>
          {problem && (
            <p className="text-sm text-red-600" role="alert">
              {problem}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
