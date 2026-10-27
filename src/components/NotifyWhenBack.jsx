import { useState } from 'react';
import { api } from '../api/index.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { errorText, fieldError } from '../lib/errorText.js';

// Production's STK-13 «بلّغنى لما يتوفر», the demo's own version: on an option with nothing to sell the customer leaves
// a name and a mobile; the moment a stock movement brings the option back, the request is told and the owner sees it on
// the back office's stock page. (Try it: ask here, then receive the option on that page as the owner.)
export default function NotifyWhenBack({ productId, variantId }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [asked, setAsked] = useState(null);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      setAsked(await api.askStockAlert({ productId, variantId, name, mobile }));
    } catch (err) {
      setProblem(err);
    } finally {
      setBusy(false);
    }
  };

  const takeBack = async () => {
    try {
      await api.cancelStockAlert(asked.id);
    } catch {
      // already told, or taken back elsewhere: nothing is left to take back
    }
    setAsked(null);
    setOpen(false);
  };

  if (asked) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3" data-testid="notify-asked">
        <span className="text-sm font-semibold text-green-800">{t('product.notify.asked')}</span>
        <button type="button" className="link text-sm" onClick={takeBack}>
          {t('product.notify.cancel')}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-4">
        <button type="button" className="btn-secondary px-5 py-2.5" onClick={() => setOpen(true)} data-testid="notify-open">
          {t('product.notify.button')}
        </button>
        <p className="mt-1 text-xs text-gray-500">{t('product.notify.hint')}</p>
      </div>
    );
  }

  const nameError = fieldError(t, problem, 'name');
  const mobileError = fieldError(t, problem, 'mobile');
  return (
    <form className="mt-4 space-y-3 rounded-xl border border-primary/20 p-4" onSubmit={send} data-testid="notify-form">
      <p className="text-sm font-semibold">{t('product.notify.button')}</p>
      <label className="block text-sm">
        <span className="text-gray-600">{t('product.notify.name')}</span>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
        {nameError && <span className="text-xs text-red-600">{nameError}</span>}
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">{t('product.notify.mobile')}</span>
        <input className="input mt-1 num-ltr" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="010 1234 5678" dir="ltr" />
        {mobileError && <span className="text-xs text-red-600">{mobileError}</span>}
      </label>
      {problem && problem.code !== 'validation' && (
        <p className="text-sm text-red-600" role="alert">
          {errorText(t, problem)}
        </p>
      )}
      <button type="submit" className="btn-primary px-5 py-2" disabled={busy}>
        {t('product.notify.send')}
      </button>
    </form>
  );
}
