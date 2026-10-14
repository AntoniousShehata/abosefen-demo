import { useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ProductArt from '../../components/ProductArt.jsx';
import { ErrorState, Loading } from '../../components/ui.jsx';
import { errorText, fieldError } from '../../lib/errorText.js';
import { matchesQuery } from '../../lib/text.js';

const START = { type: 'receive', productId: '', variantId: '', fromWarehouseId: 'w-main', toWarehouseId: 'w-show', quantity: '1', countedQuantity: '', note: '' };

export default function AdminStock() {
  const { t, pick, number, date } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [form, setForm] = useState(START);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  const warehouses = useApi(() => api.listWarehouses(), []);
  const stock = useApi(() => api.adminStock({}), []);
  const movements = useApi(() => api.listMovements({ limit: 30 }), []);

  const rows = useMemo(() => stock.data || [], [stock.data]);
  const products = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.productId)) map.set(r.productId, { id: r.productId, name: r.name, sku: r.productSku, variants: [] });
      if (r.variantId) map.get(r.productId).variants.push(r);
    }
    return [...map.values()];
  }, [rows]);

  if ((stock.loading && !stock.data) || (warehouses.loading && !warehouses.data)) return <Loading />;
  if (stock.error) return <ErrorState error={stock.error} onRetry={stock.reload} />;
  if (warehouses.error) return <ErrorState error={warehouses.error} onRetry={warehouses.reload} />;

  const shown = rows.filter(
    (r) => (!onlyLow || r.isLow || r.isOut) && (!q.trim() || matchesQuery(q, r.sku, r.name.ar, r.name.en, r.name.de, ...(r.variantLabel ? Object.values(r.variantLabel) : []))),
  );
  const product = products.find((p) => p.id === form.productId) || null;
  const unit = rows.find((r) => r.productId === form.productId && (product?.variants.length ? r.variantId === form.variantId : !r.variantId)) || null;
  const productOptions = products.filter((p) => !productFilter.trim() || matchesQuery(productFilter, p.sku, p.name.ar, p.name.en, p.name.de));
  const whName = (id) => pick(warehouses.data.find((w) => w.id === id)?.name);
  const needsFrom = form.type === 'issue' || form.type === 'transfer';
  const needsTo = form.type !== 'issue';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pickUnit = (row) => {
    setForm((f) => ({ ...f, productId: row.productId, variantId: row.variantId || '' }));
    setProductFilter('');
    setProblem(null);
    document.getElementById('movement-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const result = await api.recordStockMovement({
        ...form,
        variantId: form.variantId || null,
        quantity: Number(form.quantity),
        countedQuantity: form.countedQuantity === '' ? NaN : Number(form.countedQuantity),
      });
      toast.show(t('admin.stockPage.recorded', { number: result.movement.number }));
      setForm((f) => ({ ...f, quantity: '1', countedQuantity: '', note: '' }));
    } catch (err) {
      setProblem(err);
    } finally {
      setBusy(false);
    }
  };

  const err = (field) => fieldError(t, problem, field);
  const deltaText = (delta) =>
    Object.entries(delta || {})
      .map(([w, d]) => `${whName(w)} ${d > 0 ? '+' : '−'}${number(Math.abs(d))}`)
      .join(' · ');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">{t('admin.stock')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.stockPage.intro')}</p>
      </div>

      <form id="movement-form" className="card space-y-4 p-4" onSubmit={submit} data-testid="movement-form">
        <h2 className="text-base">{t('admin.stockPage.newMovement')}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="label">{t('admin.stockPage.type')}</span>
            <select className="input" value={form.type} onChange={set('type')} data-testid="movement-type">
              {['receive', 'issue', 'transfer', 'adjust'].map((type) => (
                <option key={type} value={type}>
                  {t(`admin.stockPage.types.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <span className="label">{t('admin.stockPage.product')}</span>
            <div className="flex gap-2">
              <input className="input w-2/5" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} placeholder={t('admin.stockPage.filterProducts')} aria-label={t('admin.stockPage.filterProducts')} />
              <select
                className="input"
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value, variantId: '' }))}
                aria-label={t('admin.stockPage.product')}
                data-testid="movement-product"
              >
                <option value="">{t('admin.stockPage.chooseProduct')}</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pick(p.name)} — {p.sku}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {product && product.variants.length > 0 && (
            <label>
              <span className="label">{t('admin.stockPage.variant')}</span>
              <select className={`input ${err('variantId') ? 'border-red-400' : ''}`} value={form.variantId} onChange={set('variantId')} data-testid="movement-variant">
                <option value="">{t('admin.stockPage.chooseVariant')}</option>
                {product.variants.map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    {pick(v.variantLabel)} ({number(v.total)})
                  </option>
                ))}
              </select>
              {err('variantId') && <span className="mt-1 block text-xs text-red-600">{err('variantId')}</span>}
            </label>
          )}
          {needsFrom && (
            <label>
              <span className="label">{t('admin.stockPage.from')}</span>
              <select className="input" value={form.fromWarehouseId} onChange={set('fromWarehouseId')}>
                {warehouses.data.map((w) => (
                  <option key={w.id} value={w.id}>
                    {pick(w.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {needsTo && (
            <label>
              <span className="label">{form.type === 'adjust' ? t('admin.stockPage.warehouse') : t('admin.stockPage.to')}</span>
              <select className={`input ${err('toWarehouseId') ? 'border-red-400' : ''}`} value={form.toWarehouseId} onChange={set('toWarehouseId')}>
                {warehouses.data.map((w) => (
                  <option key={w.id} value={w.id}>
                    {pick(w.name)}
                  </option>
                ))}
              </select>
              {err('toWarehouseId') && <span className="mt-1 block text-xs text-red-600">{err('toWarehouseId')}</span>}
            </label>
          )}
          {form.type === 'adjust' ? (
            <label>
              <span className="label">{t('admin.stockPage.counted')}</span>
              <input type="number" min="0" inputMode="numeric" className={`input ${err('countedQuantity') ? 'border-red-400' : ''}`} value={form.countedQuantity} onChange={set('countedQuantity')} />
              {err('countedQuantity') && <span className="mt-1 block text-xs text-red-600">{err('countedQuantity')}</span>}
            </label>
          ) : (
            <label>
              <span className="label">{t('admin.stockPage.quantity')}</span>
              <input type="number" min="1" inputMode="numeric" className={`input ${err('quantity') ? 'border-red-400' : ''}`} value={form.quantity} onChange={set('quantity')} data-testid="movement-quantity" />
              {err('quantity') && <span className="mt-1 block text-xs text-red-600">{err('quantity')}</span>}
            </label>
          )}
          <label className="md:col-span-2">
            <span className="label">
              {t('admin.stockPage.note')} <span className="font-normal text-gray-400">({t('common.optional')})</span>
            </span>
            <input className="input" value={form.note} onChange={set('note')} maxLength={140} />
          </label>
        </div>
        {unit && (
          <p className="text-sm text-gray-600" data-testid="unit-balance">
            {warehouses.data.map((w) => `${pick(w.name)}: ${number(unit.quantities[w.id])}`).join(' · ')} · {t('admin.stockPage.total')}: {number(unit.total)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy || !form.productId} data-testid="movement-submit">
            {t('admin.stockPage.record')}
          </button>
          {problem && problem.code !== 'validation' && (
            <p className="text-sm text-red-600" role="alert">
              {errorText(t, problem)}
            </p>
          )}
        </div>
      </form>

      <div className="card flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-[12rem] flex-1">
          <span className="label">{t('common.search')}</span>
          <input type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.stockPage.search')} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="accent-primary" />
          {t('admin.stockPage.onlyLow')}
        </label>
      </div>

      <div className="card max-h-[32rem] overflow-auto">
        <table className="w-full min-w-[40rem]">
          <thead className="sticky top-0 border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="table-th">{t('admin.stockPage.item')}</th>
              {warehouses.data.map((w) => (
                <th key={w.id} className="table-th">
                  {pick(w.name)}
                </th>
              ))}
              <th className="table-th">{t('admin.stockPage.total')}</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className={`border-t border-gray-100 ${r.isOut ? 'bg-red-50/40' : r.isLow ? 'bg-amber-50/50' : ''}`}>
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <ProductArt art={r.art} className="h-9 w-9 shrink-0 rounded bg-gray-50" label={pick(r.name)} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{pick(r.name)}</p>
                      <p className="text-xs text-gray-500">
                        {r.variantLabel ? `${pick(r.variantLabel)} · ` : ''}
                        <span className="num-ltr">{r.sku}</span>
                      </p>
                    </div>
                  </div>
                </td>
                {warehouses.data.map((w) => (
                  <td key={w.id} className="table-td num-ltr">
                    {r.quantities[w.id]}
                  </td>
                ))}
                <td className={`table-td num-ltr font-semibold ${r.isOut ? 'text-red-600' : r.isLow ? 'text-amber-700' : 'text-gray-900'}`}>{r.total}</td>
                <td className="table-td">
                  <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => pickUnit(r)}>
                    {t('admin.stockPage.newMovement')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-6 text-center text-sm text-gray-500">{t('admin.stockPage.empty')}</p>}
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-base">{t('admin.stockPage.movements')}</h2>
        {movements.data && movements.data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem]" data-testid="movements-table">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">{t('admin.stockPage.colNumber')}</th>
                  <th className="table-th">{t('admin.stockPage.colDate')}</th>
                  <th className="table-th">{t('admin.stockPage.type')}</th>
                  <th className="table-th">{t('admin.stockPage.item')}</th>
                  <th className="table-th">{t('admin.stockPage.colChange')}</th>
                  <th className="table-th">{t('admin.stockPage.colBy')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="table-td num-ltr text-gray-500">{m.number}</td>
                    <td className="table-td whitespace-nowrap text-gray-500">{date(m.at, true)}</td>
                    <td className="table-td">{t(`admin.stockPage.types.${m.type}`)}</td>
                    <td className="table-td">
                      <p className="text-gray-900">{pick(m.name)}</p>
                      <p className="text-xs text-gray-500">
                        {m.variantLabel ? `${pick(m.variantLabel)} · ` : ''}
                        <span className="num-ltr">{m.sku}</span>
                        {m.note ? ` · ${m.note}` : ''}
                      </p>
                    </td>
                    <td className="table-td whitespace-nowrap">{deltaText(m.delta)}</td>
                    <td className="table-td num-ltr text-xs text-gray-500">{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t('admin.stockPage.noMovements')}</p>
        )}
      </section>
    </div>
  );
}
