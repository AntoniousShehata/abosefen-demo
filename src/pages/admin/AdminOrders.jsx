import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import OrderTimeline from '../../components/OrderTimeline.jsx';
import { ErrorState, Loading, Modal, StatusBadge } from '../../components/ui.jsx';
import { errorText } from '../../lib/errorText.js';
import { ORDER_STATUSES, RESTOCKING_STATUSES } from '../../lib/orderFlow.js';
import { OrderLines } from '../OrderPage.jsx';

export default function AdminOrders() {
  const { t, money, date, number } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') || '');   // a link opens the list already searched
  const [selectedId, setSelectedId] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useApi(() => api.adminOrders({ status, q }), [status, q]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const selected = data.items.find((o) => o.id === selectedId) || null;

  const move = async (order, next) => {
    setBusy(true);
    setProblem('');
    try {
      const updated = await api.changeOrderStatus(order.id, next);
      toast.show(t('admin.ordersPage.changed', { number: updated.orderNumber, status: t(`order.statuses.${updated.status}`) }));
      setConfirming(null);
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('admin.orders')}</h1>
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-[12rem] flex-1">
          <span className="label">{t('common.search')}</span>
          <input type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.ordersPage.search')} />
        </label>
        <label className="min-w-[12rem]">
          <span className="label">{t('admin.ordersPage.colStatus')}</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="status-filter">
            <option value="">
              {t('admin.ordersPage.allStatuses')} ({number(data.total)})
            </option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`order.statuses.${s}`)} ({number(data.counts[s] || 0)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_26rem]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem]" data-testid="orders-table">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">{t('admin.ordersPage.colNumber')}</th>
                <th className="table-th">{t('admin.ordersPage.colDate')}</th>
                <th className="table-th">{t('admin.ordersPage.colCustomer')}</th>
                <th className="table-th">{t('admin.ordersPage.colItems')}</th>
                <th className="table-th">{t('admin.ordersPage.colTotal')}</th>
                <th className="table-th">{t('admin.ordersPage.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => {
                    setSelectedId(o.id);
                    setProblem('');
                  }}
                  className={`cursor-pointer border-t border-gray-100 ${o.id === selectedId ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                >
                  <td className="table-td">
                    <button type="button" className="num-ltr font-semibold text-primary hover:underline" onClick={() => setSelectedId(o.id)}>
                      {o.orderNumber}
                    </button>
                  </td>
                  <td className="table-td whitespace-nowrap text-gray-500">{date(o.createdAt)}</td>
                  <td className="table-td">
                    <p className="text-gray-900">{o.customerName}</p>
                    <p className="num-ltr text-xs text-gray-400">{o.phone}</p>
                  </td>
                  <td className="table-td num-ltr">{o.itemCount}</td>
                  <td className="table-td whitespace-nowrap">{money(o.totalAmount)}</td>
                  <td className="table-td">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <p className="p-6 text-center text-sm text-gray-500">{t('admin.ordersPage.empty')}</p>}
        </div>

        <aside className="card p-4" data-testid="order-detail">
          {!selected ? (
            <p className="py-10 text-center text-sm text-gray-500">{t('admin.ordersPage.selectHint')}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="num-ltr text-lg">{selected.orderNumber}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">{selected.customerName}</p>
                <p className="num-ltr">{selected.phone}</p>
                <p>
                  {selected.deliveryMethod === 'pickup'
                    ? t('order.pickupAt')
                    : `${selected.address}${selected.governorate ? ` — ${t(`governorates.${selected.governorate}`)}` : ''}`}
                </p>
                <p>
                  {t('admin.ordersPage.colPayment')}: {t(`order.paymentStatuses.${selected.paymentStatus}`)}
                </p>
              </div>
              <div>
                <p className="label">{t('admin.ordersPage.moveTo')}</p>
                {selected.allowedNext.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.allowedNext.map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={busy}
                        className={RESTOCKING_STATUSES.includes(next) ? 'btn-ghost border-red-300 text-red-700 hover:bg-red-50' : 'btn-primary'}
                        onClick={() => (RESTOCKING_STATUSES.includes(next) ? setConfirming({ order: selected, next }) : move(selected, next))}
                        data-testid={`move-${next}`}
                      >
                        {t(`order.statuses.${next}`)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t('admin.ordersPage.noNext')}</p>
                )}
                {problem && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {problem}
                  </p>
                )}
              </div>
              <OrderTimeline order={selected} />
              <OrderLines order={selected} />
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={!!confirming}
        title={confirming ? t(`order.statuses.${confirming.next}`) : ''}
        onClose={() => setConfirming(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setConfirming(null)}>
              {t('common.no')}
            </button>
            <button type="button" className="btn-danger" disabled={busy} onClick={() => move(confirming.order, confirming.next)}>
              {t('common.yes')}
            </button>
          </>
        }
      >
        {confirming && <p className="text-gray-700">{t('admin.ordersPage.confirmCancel', { number: confirming.order.orderNumber })}</p>}
      </Modal>
    </div>
  );
}
