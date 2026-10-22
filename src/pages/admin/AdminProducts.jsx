import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ProductArt from '../../components/ProductArt.jsx';
import { ErrorState, Loading, Modal } from '../../components/ui.jsx';
import { errorText } from '../../lib/errorText.js';
import { pathText } from './AdminHome.jsx';

const indent = (depth) => '   '.repeat(depth);

export function CategoryOptions({ categories, markParents = false }) {
  const { t, pick } = useI18n();
  return categories.map((c) => (
    <option key={c.id} value={c.id}>
      {indent(c.depth)}
      {pick(c.name)}
      {markParents && !c.isLeaf ? ` (${t('admin.productsPage.hasChildren')})` : ''}
    </option>
  ));
}

function PreviewBody({ plan }) {
  const { t, pick, number } = useI18n();
  return (
    <div className="space-y-5 text-sm" data-testid="move-preview">
      <p className="text-gray-600">{t('admin.productsPage.previewIntro')}</p>
      {plan.blockers.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-red-700" role="alert">
          {plan.blockers.map((b) => (
            <li key={b.code}>{t(`errors.${b.code}`, b.details)}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <span className="badge bg-primary/10 text-primary">{t('admin.productsPage.willMove', { count: number(plan.counts.willMove) })}</span>
        {plan.counts.unchanged > 0 && (
          <span className="badge bg-gray-100 text-gray-600">{t('admin.productsPage.unchanged', { count: number(plan.counts.unchanged) })}</span>
        )}
      </div>
      {plan.affectedCategories.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-800">{t('admin.productsPage.affected')}</h3>
          <table className="w-full overflow-hidden rounded-lg border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">{t('admin.productsPage.colCategory')}</th>
                <th className="table-th">{t('admin.productsPage.before')}</th>
                <th className="table-th">{t('admin.productsPage.after')}</th>
              </tr>
            </thead>
            <tbody>
              {plan.affectedCategories.map((a) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="table-td">{pathText(pick, a.path)}</td>
                  <td className="table-td num-ltr">{a.before}</td>
                  <td className={`table-td num-ltr font-semibold ${a.after > a.before ? 'text-emerald-700' : 'text-red-600'}`}>{a.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {plan.changes.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-800">{t('admin.productsPage.willMove', { count: number(plan.changes.length) })}</h3>
          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {plan.changes.map((c) => (
              <li key={c.productId} className="px-3 py-2">
                <p className="font-medium text-gray-900">
                  {pick(c.name)} <span className="num-ltr text-xs text-gray-400">{c.sku}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {t('admin.productsPage.from')}: {pathText(pick, c.from.path)} — {t('admin.productsPage.to')}: <span className="font-semibold text-gray-700">{pathText(pick, c.to?.path)}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdminProducts() {
  const { t, pick, money, number } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [target, setTarget] = useState('');
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const categories = useApi(() => api.listCategories({ includeHidden: true }), []);
  const products = useApi(() => api.adminProducts({ q, categoryId: categoryId || null }), [q, categoryId]);
  const shown = useMemo(() => products.data || [], [products.data]);

  if ((products.loading && !products.data) || (categories.loading && !categories.data)) return <Loading />;
  if (products.error) return <ErrorState error={products.error} onRetry={products.reload} />;
  if (categories.error) return <ErrorState error={categories.error} onRetry={categories.reload} />;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.id));

  const preview = async () => {
    setBusy(true);
    setProblem('');
    try {
      setPlan(await api.previewBulkMove({ productIds: [...selected], targetCategoryId: target }));
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    setProblem('');
    try {
      const result = await api.applyBulkMove({ productIds: [...selected], targetCategoryId: target, token: plan.token });
      toast.show(t('admin.productsPage.moved', { count: number(result.moved) }));
      setPlan(null);
      setSelected(new Set());
      setTarget('');
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('admin.products')}</h1>
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-[12rem] flex-1">
          <span className="label">{t('common.search')}</span>
          <input type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.productsPage.search')} />
        </label>
        <label className="min-w-[12rem]">
          <span className="label">{t('admin.productsPage.filterCategory')}</span>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('admin.productsPage.allCategories')}</option>
            <CategoryOptions categories={categories.data} />
          </select>
        </label>
        <span className="pb-2 text-sm text-gray-500">{t('common.products', { count: number(shown.length) })}</span>
      </div>

      {selected.size > 0 && (
        <div className="card sticky top-32 z-10 flex flex-wrap items-end gap-3 border-primary/30 bg-primary/5 p-3" data-testid="bulk-bar">
          <span className="pb-2 text-sm font-semibold text-primary">{t('admin.productsPage.selected', { count: number(selected.size) })}</span>
          <label className="min-w-[14rem] flex-1">
            <span className="label">{t('admin.productsPage.moveTo')}</span>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="bulk-target">
              <option value="">{t('admin.productsPage.chooseTarget')}</option>
              <CategoryOptions categories={categories.data} markParents />
            </select>
          </label>
          <button type="button" className="btn-primary" onClick={preview} disabled={!target || busy} data-testid="bulk-preview">
            {t('admin.productsPage.preview')}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setSelected(new Set())}>
            {t('admin.productsPage.clear')}
          </button>
        </div>
      )}
      {problem && !plan && (
        <p className="text-sm text-red-600" role="alert">
          {problem}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[44rem]">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="table-th w-10">
                <input
                  type="checkbox"
                  aria-label={t('admin.productsPage.selectAll')}
                  checked={allShownSelected}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      shown.forEach((p) => (allShownSelected ? next.delete(p.id) : next.add(p.id)));
                      return next;
                    })
                  }
                  className="accent-primary"
                />
              </th>
              <th className="table-th">{t('admin.productsPage.colName')}</th>
              <th className="table-th">{t('admin.productsPage.colCategory')}</th>
              <th className="table-th">{t('admin.productsPage.colPrice')}</th>
              <th className="table-th">{t('admin.productsPage.colStock')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={`border-t border-gray-100 ${selected.has(p.id) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                <td className="table-td">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={pick(p.name)} className="accent-primary" data-testid="row-check" />
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <ProductArt art={p.art} className="h-10 w-10 shrink-0 rounded bg-gray-50" label={pick(p.name)} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {pick(p.name)}
                        {p.productType === 'bundle' && <span className="badge ms-2 bg-primary/10 text-primary">{t('admin.productsPage.set')}</span>}
                      </p>
                      <p className="num-ltr text-xs text-gray-400">{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="table-td text-gray-600">
                  {p.categoryPath.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ' / '}
                      <Link to={`/c/${c.slug}`} className="hover:text-primary hover:underline">
                        {pick(c.name)}
                      </Link>
                    </span>
                  ))}
                </td>
                <td className="table-td whitespace-nowrap">{money(p.price)}</td>
                <td className={`table-td num-ltr ${p.stock === 0 ? 'text-red-600' : p.stock <= 3 ? 'text-amber-700' : 'text-gray-700'}`}>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-6 text-center text-sm text-gray-500">{t('admin.productsPage.empty')}</p>}
      </div>

      <Modal
        open={!!plan}
        wide
        title={t('admin.productsPage.previewTitle')}
        onClose={() => setPlan(null)}
        footer={
          <>
            {problem && (
              <p className="me-auto self-center text-sm text-red-600" role="alert">
                {problem}
              </p>
            )}
            <button type="button" className="btn-ghost" onClick={() => setPlan(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary" onClick={apply} disabled={!plan?.canApply || busy} data-testid="bulk-confirm">
              {t('admin.productsPage.confirm')}
            </button>
          </>
        }
      >
        {plan && <PreviewBody plan={plan} />}
      </Modal>
    </div>
  );
}
