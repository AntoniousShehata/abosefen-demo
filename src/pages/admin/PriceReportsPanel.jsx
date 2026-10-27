import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorText } from '../../lib/errorText.js';

// Production's PRC-2: what customers found cheaper elsewhere. Each report shows the shop's price as the page showed it,
// theirs, and the difference; the owner answers on his own WhatsApp and marks it answered. Nothing here changes a price.
export default function PriceReportsPanel() {
  const { t, pick, money, number, date } = useI18n();
  const toast = useToast();
  const reports = useApi(() => api.adminPriceReports(), []);
  const rows = reports.data || [];

  const mark = async (row, answered) => {
    try {
      await api.markPriceReportAnswered(row.id, answered);
    } catch (err) {
      toast.show(errorText(t, err));
    }
  };

  return (
    <section className="card p-5" data-testid="price-reports">
      <h2 className="text-base">{t('admin.priceReports.title')}</h2>
      <p className="mt-1 text-sm text-gray-600">{t('admin.priceReports.intro')}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t('admin.priceReports.empty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {rows.map((row) => {
            const less = row.ourPrice - row.theirPrice;
            return (
              <li key={row.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-medium text-gray-900">{pick(row.product)}</p>
                  <span className="text-xs text-gray-500">
                    {row.variantLabel ? `${pick(row.variantLabel)} · ` : ''}
                    <span className="num-ltr">{row.sku}</span> · {date(row.at, true)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {t('admin.priceReports.prices', {
                    ours: money(row.ourPrice),
                    theirs: money(row.theirPrice),
                    less: money(less),
                    share: number(Math.round((less / row.ourPrice) * 100)),
                  })}
                </p>
                <p className="text-sm text-gray-700">
                  {t('admin.priceReports.where', { place: row.place })} ·{' '}
                  <a href={row.link} target="_blank" rel="noopener noreferrer nofollow" className="link num-ltr">
                    {t('admin.priceReports.link')}
                  </a>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {row.name} · <span className="num-ltr">{row.mobile}</span>
                  </span>
                  {row.state === 'new' ? (
                    <button type="button" className="btn-primary ms-auto px-3 py-1.5 text-sm" onClick={() => mark(row, true)}>
                      {t('admin.priceReports.markAnswered')}
                    </button>
                  ) : (
                    <>
                      <span className="ms-auto rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                        {t('admin.priceReports.answered')}
                      </span>
                      <button type="button" className="link text-sm" onClick={() => mark(row, false)}>
                        {t('admin.priceReports.notAnswered')}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
