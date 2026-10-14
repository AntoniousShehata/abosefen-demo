import { Fragment } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { STAGES, STATUS_STAGE } from '../lib/orderFlow.js';

/** «Where is my order»: four plain stages, as the shop's own tracker shows them, plus the dated history. */
export default function OrderTimeline({ order, showHistory = true }) {
  const { t, date } = useI18n();
  const { status } = order;
  const ended = status === 'Cancelled' || status === 'Returned';
  const current = STATUS_STAGE[status] ?? -1;

  return (
    <div data-testid="order-timeline">
      {ended ? (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          {t(status === 'Cancelled' ? 'order.cancelledNotice' : 'order.returnedNotice')}
        </p>
      ) : (
        <>
          <ol className="flex items-start">
            {STAGES.map((stage, i) => {
              const reached = i <= current;
              const active = i === current;
              return (
                <Fragment key={stage}>
                  <li className="flex w-16 shrink-0 flex-col items-center text-center sm:w-24">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors ${
                        reached ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                      } ${active ? 'ring-4 ring-primary/20' : ''}`}
                      aria-current={active ? 'step' : undefined}
                    >
                      {i < current ? '✓' : i + 1}
                    </span>
                    <span className={`mt-1.5 text-xs leading-tight ${reached ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                      {t(`order.stages.${stage}`)}
                    </span>
                  </li>
                  {i < STAGES.length - 1 && <li aria-hidden="true" className={`mt-4 h-0.5 flex-1 ${i < current ? 'bg-primary' : 'bg-gray-200'}`} />}
                </Fragment>
              );
            })}
          </ol>
          {status === 'Pending' && <p className="mt-3 text-sm text-amber-700">{t('order.awaitingNotice')}</p>}
        </>
      )}
      {showHistory && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('order.history')}</h3>
          <ol className="space-y-2 border-s-2 border-gray-100 ps-4">
            {[...order.history].reverse().map((h, i) => (
              <li key={`${h.status}-${i}`} className="relative text-sm">
                <span className="absolute -start-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/60" />
                <span className="font-semibold text-gray-800">{t(`order.statuses.${h.status}`)}</span>
                <span className="text-gray-500"> · {date(h.at, true)}</span>
                {h.note && <span className="text-gray-500"> · {t(`order.notes.${h.note}`)}</span>}
                {h.by && h.by !== 'system' && (
                  <span className="text-xs text-gray-400"> · {t('order.by', { who: h.by.includes('@') ? h.by : t(`order.actors.${h.by}`) })}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
