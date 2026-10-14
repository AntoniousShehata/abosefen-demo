import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { errorText } from '../lib/errorText.js';

export function Loading({ className = '' }) {
  const { t } = useI18n();
  return (
    <div className={`flex items-center justify-center gap-3 py-16 text-gray-500 ${className}`} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <span>{t('common.loading')}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="card mx-auto my-10 max-w-lg p-6 text-center" role="alert">
      <p className="text-gray-800">{errorText(t, error)}</p>
      {onRetry && (
        <button type="button" className="btn-ghost mt-4" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="card mx-auto my-6 max-w-xl p-8 text-center">
      {title && <p className="text-lg font-semibold text-gray-900">{title}</p>}
      {text && <p className="mt-2 text-gray-500">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function Modal({ open, title, children, onClose, footer, wide = false }) {
  const { t } = useI18n();
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl bg-white shadow-xl focus:outline-none sm:rounded-2xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={t('common.close')}>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4z" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 999, disabled = false }) {
  const { t } = useI18n();
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        className="h-9 w-9 text-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={t('cart.decrease')}
      >
        −
      </button>
      <span className="num-ltr w-10 text-center text-sm font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="h-9 w-9 text-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={t('cart.increase')}
      >
        +
      </button>
    </div>
  );
}

export function Price({ pricing, size = 'md', showFrom = false }) {
  const { money, t } = useI18n();
  if (!pricing) return null;
  const big = size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {showFrom && <span className="text-xs text-gray-500">{t('common.from')}</span>}
      <span className={`font-bold text-gray-900 ${big}`}>{money(pricing.salePrice)}</span>
      {pricing.isOnSale && (
        <>
          <span className="text-sm text-gray-400 line-through">{money(pricing.originalPrice)}</span>
          <span className="badge bg-secondary/10 text-secondary">{t('product.save', { percent: pricing.discountPercentage })}</span>
        </>
      )}
    </div>
  );
}

export function StockBadge({ quantity, threshold = 3 }) {
  const { t } = useI18n();
  if (quantity <= 0) return <span className="badge bg-gray-100 text-gray-500">{t('product.outOfStock')}</span>;
  if (quantity <= threshold) return <span className="badge bg-amber-50 text-amber-700">{t('product.lowStock', { count: quantity })}</span>;
  return <span className="badge bg-emerald-50 text-emerald-700">{t('product.inStock')}</span>;
}

export function StatusBadge({ status }) {
  const { t } = useI18n();
  const tone =
    status === 'Cancelled' || status === 'Returned'
      ? 'bg-gray-100 text-gray-600'
      : status === 'Pending'
        ? 'bg-amber-50 text-amber-700'
        : status === 'Delivered' || status === 'Completed'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-primary/10 text-primary';
  return <span className={`badge ${tone}`}>{t(`order.statuses.${status}`)}</span>;
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl sm:text-2xl">{children}</h2>
      {action}
    </div>
  );
}
