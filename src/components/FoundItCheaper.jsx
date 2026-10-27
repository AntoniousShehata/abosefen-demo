import { useState } from 'react';
import { api } from '../api/index.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { errorText, fieldError } from '../lib/errorText.js';

// Production's PRC-2 «لقيته أرخص؟», the demo's own version: under the price the customer says where they saw it for
// less, at what price, with a link; the report reaches the owner's list on the back office's home. (Production also takes
// one photo of the price, from the camera or the gallery.)
export default function FoundItCheaper({ productId, variantId }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ place: '', price: '', link: '', name: '', mobile: '' });
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      await api.sendPriceReport({ productId, variantId, ...form });
      setSent(true);
    } catch (err) {
      setProblem(err);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <p className="text-sm font-semibold text-green-800" data-testid="cheaper-sent">
        {t('product.cheaper.sent')}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="link text-sm" onClick={() => setOpen(true)} data-testid="cheaper-open">
        {t('product.cheaper.button')}
      </button>
    );
  }

  const field = (name, props = {}) => {
    const error = fieldError(t, problem, name);
    return (
      <label className="block text-sm">
        <span className="text-gray-600">{t(`product.cheaper.${name}`)}</span>
        <input className={`input mt-1 ${props.dir === 'ltr' ? 'num-ltr' : ''}`} value={form[name]} onChange={set(name)} {...props} />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </label>
    );
  };

  return (
    <form className="space-y-3 rounded-xl border border-primary/20 p-4" onSubmit={send} data-testid="cheaper-form">
      <p className="text-sm font-semibold">{t('product.cheaper.title')}</p>
      {field('place', { maxLength: 120 })}
      {field('price', { inputMode: 'decimal', dir: 'ltr' })}
      {field('link', { type: 'url', placeholder: 'https://', dir: 'ltr' })}
      {field('name', { maxLength: 60, autoComplete: 'name' })}
      {field('mobile', { inputMode: 'tel', placeholder: '010 1234 5678', dir: 'ltr' })}
      {problem && problem.code !== 'validation' && (
        <p className="text-sm text-red-600" role="alert">
          {errorText(t, problem)}
        </p>
      )}
      <p className="text-xs text-gray-500">{t('product.cheaper.who')}</p>
      <button type="submit" className="btn-primary px-5 py-2" disabled={busy}>
        {t('product.cheaper.send')}
      </button>
    </form>
  );
}
