import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorText } from '../../lib/errorText.js';

const TONE = { waiting: 'bg-gray-100 text-gray-700', arrived: 'bg-green-100 text-green-800', messaged: 'bg-sky-100 text-sky-800' };

// Production's STK-13: who waits for an option that is out of stock. A receipt that brings the option back turns its
// requests «back in stock»; the owner then sends his own WhatsApp (in production the message opens ready — here it is
// copied) and marks it sent. The program never sends WhatsApp.
export default function StockAlertsPanel() {
  const { t, pick, date } = useI18n();
  const toast = useToast();
  const alerts = useApi(() => api.adminStockAlerts(), []);
  const rows = alerts.data || [];

  const copy = async (row) => {
    const text = t('admin.stockAlerts.message', { name: row.name, product: pick(row.product) });
    try {
      await navigator.clipboard.writeText(text);
      toast.show(t('admin.stockAlerts.copied'));
    } catch {
      toast.show(text);
    }
  };

  const mark = async (row, messaged) => {
    try {
      await api.markStockAlertMessaged(row.id, messaged);
    } catch (err) {
      toast.show(errorText(t, err));
    }
  };

  return (
    <section className="card p-4" data-testid="stock-alerts">
      <h2 className="text-base">{t('admin.stockAlerts.title')}</h2>
      <p className="mt-1 text-sm text-gray-600">{t('admin.stockAlerts.intro')}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t('admin.stockAlerts.empty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{pick(row.product)}</p>
                <p className="text-xs text-gray-500">
                  {row.variantLabel ? `${pick(row.variantLabel)} · ` : ''}
                  <span className="num-ltr">{row.sku}</span> · {row.name} · <span className="num-ltr">{row.mobile}</span> · {date(row.at, true)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[row.state]}`}>{t(`admin.stockAlerts.states.${row.state}`)}</span>
              {row.state === 'arrived' && (
                <>
                  <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => copy(row)}>
                    {t('admin.stockAlerts.copy')}
                  </button>
                  <button type="button" className="btn-primary px-3 py-1.5 text-sm" onClick={() => mark(row, true)}>
                    {t('admin.stockAlerts.markSent')}
                  </button>
                </>
              )}
              {row.state === 'messaged' && (
                <button type="button" className="link text-sm" onClick={() => mark(row, false)}>
                  {t('admin.stockAlerts.notSent')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
