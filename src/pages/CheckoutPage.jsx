import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { GOVERNORATES } from '../data/catalog.js';
import { EmptyState, ErrorState, Loading } from '../components/ui.jsx';
import { TotalsTable } from './CartPage.jsx';
import { errorText, fieldError } from '../lib/errorText.js';

export function SimulationNotice() {
  const { t } = useI18n();
  return (
    <div className="flex gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-amber-950" role="note" data-testid="simulation-notice">
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="font-bold">{t('checkout.simulation')}</p>
        <p className="text-sm">{t('checkout.simulationNote')}</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { t, pick } = useI18n();
  const { user } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    deliveryMethod: 'delivery',
    governorate: '',
    address: '',
    paymentMethod: 'card',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const cart = useApi(() => api.getCart({ deliveryMethod: form.deliveryMethod, governorate: form.governorate }), [form.deliveryMethod, form.governorate]);

  if (cart.loading && !cart.data) return <Loading />;
  if (cart.error) return <ErrorState error={cart.error} onRetry={cart.reload} />;
  if (!cart.data.lines.length) {
    return (
      <EmptyState title={t('checkout.emptyCart')}>
        <Link to="/categories" className="btn-primary">
          {t('cart.continue')}
        </Link>
      </EmptyState>
    );
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fieldClass = (field) => `input ${fieldError(t, error, field) ? 'border-red-400 ring-2 ring-red-100' : ''}`;
  const FieldError = ({ field }) => {
    const message = fieldError(t, error, field);
    return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await api.placeOrder(form);
      navigate(`/orders/${order.id}?placed=1`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl sm:text-3xl">{t('checkout.title')}</h1>
      <SimulationNotice />
      <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]" onSubmit={submit} noValidate>
        <div className="space-y-6">
          <fieldset className="card space-y-4 p-5">
            <legend className="px-1 text-base font-bold text-gray-900">{t('checkout.contact')}</legend>
            <p className="text-xs text-gray-500">{user ? t('checkout.signedInAs', { email: user.email }) : t('checkout.guest')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">
                  {t('checkout.name')}
                </label>
                <input id="name" className={fieldClass('name')} value={form.name} onChange={set('name')} autoComplete="off" />
                <FieldError field="name" />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  {t('checkout.phone')}
                </label>
                <input id="phone" type="tel" dir="ltr" className={fieldClass('phone')} value={form.phone} onChange={set('phone')} autoComplete="off" placeholder="0100 000 0000" />
                <p className="mt-1 text-xs text-gray-400">{t('checkout.phoneHint')}</p>
                <FieldError field="phone" />
              </div>
            </div>
          </fieldset>

          <fieldset className="card space-y-4 p-5">
            <legend className="px-1 text-base font-bold text-gray-900">{t('checkout.delivery')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['delivery', t('checkout.deliveryHome')],
                ['pickup', t('checkout.pickup')],
              ].map(([value, label]) => (
                <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${form.deliveryMethod === value ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                  <input type="radio" name="deliveryMethod" value={value} checked={form.deliveryMethod === value} onChange={set('deliveryMethod')} className="accent-primary" />
                  {label}
                </label>
              ))}
            </div>
            {form.deliveryMethod === 'delivery' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="governorate">
                    {t('checkout.governorate')}
                  </label>
                  <select id="governorate" className={fieldClass('governorate')} value={form.governorate} onChange={set('governorate')}>
                    <option value="">{t('checkout.chooseGovernorate')}</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g.code} value={g.code}>
                        {t(`governorates.${g.code}`)}
                      </option>
                    ))}
                  </select>
                  <FieldError field="governorate" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="address">
                    {t('checkout.address')}
                  </label>
                  <textarea id="address" rows={2} className={fieldClass('address')} value={form.address} onChange={set('address')} autoComplete="off" />
                  <FieldError field="address" />
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className="card space-y-3 p-5">
            <legend className="px-1 text-base font-bold text-gray-900">{t('checkout.payment')}</legend>
            {[
              ['card', t('checkout.payCard')],
              ['cash', t('checkout.payCash')],
            ].map(([value, label]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${form.paymentMethod === value ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                <input type="radio" name="paymentMethod" value={value} checked={form.paymentMethod === value} onChange={set('paymentMethod')} className="accent-primary" />
                {label}
              </label>
            ))}
          </fieldset>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-3 text-base">{t('cart.summary')}</h2>
            <ul className="mb-3 space-y-1 text-sm text-gray-600">
              {cart.data.lines.map((l) => (
                <li key={l.lineKey} className="flex justify-between gap-2">
                  <span className="truncate">
                    {pick(l.name)} <span className="num-ltr text-gray-400">× {l.quantity}</span>
                  </span>
                </li>
              ))}
            </ul>
            <TotalsTable totals={cart.data.totals} showShipping />
            <button type="submit" className="btn-primary mt-4 w-full py-2.5" disabled={busy} data-testid="place-order">
              {busy ? t('checkout.placing') : t('checkout.placeOrder')}
            </button>
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error.code === 'validation' ? t('checkout.fixErrors') : errorText(t, error)}
              </p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
