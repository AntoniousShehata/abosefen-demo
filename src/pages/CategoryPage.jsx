import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/ui.jsx';

/** The filter panel of a list: every maker, size and finish of the WHOLE category, each with its count (production's UX-20). */
function FilterPanel({ facets, chosen, onToggle, labels, pick }) {
  const groups = [
    { param: 'brand', title: labels.brand, items: facets.brands.map((b) => ({ value: b.code, label: pick(b.name), count: b.count })), on: chosen.brands },
    { param: 'size', title: labels.sizes, items: facets.sizes.map((s) => ({ value: s.key, label: pick(s.label), count: s.count })), on: chosen.sizes },
    { param: 'finish', title: labels.finishes, items: facets.finishes.map((f) => ({ value: f.code, label: pick(f.name), count: f.count, hex: f.hex })), on: chosen.finishes },
  ].filter((g) => g.items.length > 1 || g.on.length > 0);
  if (groups.length === 0) return null;
  return (
    <div className="card mb-4 space-y-3 p-4" data-testid="filter-panel">
      {groups.map((g) => (
        <div key={g.param} className="flex flex-wrap items-center gap-2">
          <span className="w-28 shrink-0 text-sm font-semibold text-gray-600">{g.title}</span>
          {g.items.map((i) => {
            const on = g.on.includes(i.value);
            return (
              <button
                key={i.value}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(g.param, i.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${on ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-800 hover:border-primary'}`}
              >
                {i.hex && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: i.hex }} aria-hidden="true" />}
                <bdi>{i.label}</bdi>
                <span className={`text-xs ${on ? 'text-white/80' : 'text-gray-500'}`}>({i.count})</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function CategoryPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') || 'featured';
  // Production's UX-20: the filter choices live in the address (each repeated) — «back» keeps them, a link carries them,
  // another category starts clean.
  const chosen = { brands: params.getAll('brand'), sizes: params.getAll('size'), finishes: params.getAll('finish') };
  const chosenKey = JSON.stringify(chosen);
  const chosenCount = chosen.brands.length + chosen.sizes.length + chosen.finishes.length;
  const { t, pick, number, lang } = useI18n();

  const head = useApi(() => api.getCategory(slug), [slug]);
  const categoryId = head.data?.category.id;
  const list = useApi(
    () => (categoryId ? api.listProducts({ categoryId, brandCodes: chosen.brands, sizes: chosen.sizes, finishes: chosen.finishes, sort, lang }) : Promise.resolve(null)),
    [categoryId, chosenKey, sort, lang],
  );

  if (head.loading && !head.data) return <Loading />;
  if (head.error) {
    return head.error.code === 'categoryNotFound' ? (
      <EmptyState title={t('category.notFound')}>
        <Link to="/categories" className="btn-primary">
          {t('nav.allCategories')}
        </Link>
      </EmptyState>
    ) : (
      <ErrorState error={head.error} onRetry={head.reload} />
    );
  }

  const { category, path, children } = head.data;
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const toggle = (param, value) => {
    const next = new URLSearchParams(params);
    const now = next.getAll(param);
    next.delete(param);
    for (const v of now.includes(value) ? now.filter((x) => x !== value) : [...now, value]) next.append(param, v);
    setParams(next, { replace: true });
  };
  const clearChoices = () => {
    const next = new URLSearchParams(params);
    for (const k of ['brand', 'size', 'finish']) next.delete(k);
    setParams(next, { replace: true });
  };
  const facets = list.data?.facets;
  const labelOf = (kind, value) => {
    const item = facets?.[kind]?.find((x) => (kind === 'brands' ? x.code : kind === 'sizes' ? x.key : x.code) === value);
    return item ? pick(kind === 'sizes' ? item.label : item.name) : value;
  };

  return (
    <div>
      <Breadcrumb path={path} />
      <div className="flex items-center gap-4">
        <ProductArt art={category.art} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" label={pick(category.name)} />
        <div>
          <h1 className="text-2xl sm:text-3xl">{pick(category.name)}</h1>
          <p className="text-sm text-gray-500">{t('common.products', { count: number(category.productCount) })}</p>
        </div>
      </div>

      {children.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t('category.subcategories')}</h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {children.map((c) => (
              <Link key={c.id} to={`/c/${c.slug}`} className="card flex w-36 shrink-0 flex-col items-center p-3 text-center hover:shadow-md sm:w-40">
                <ProductArt art={c.art} className="h-16 w-16" label={pick(c.name)} />
                <span className="mt-2 text-sm font-semibold text-gray-900">{pick(c.name)}</span>
                <span className="text-xs text-gray-500">{t('common.products', { count: number(c.productCount) })}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="me-auto text-xl">{t('category.products')}</h2>
          <label className="text-sm">
            <span className="label">{t('category.sort')}</span>
            <select className="input py-1.5" value={sort} onChange={(e) => setParam('sort', e.target.value === 'featured' ? '' : e.target.value)}>
              <option value="featured">{t('category.sortFeatured')}</option>
              <option value="priceAsc">{t('category.sortPriceAsc')}</option>
              <option value="priceDesc">{t('category.sortPriceDesc')}</option>
              <option value="name">{t('category.sortName')}</option>
            </select>
          </label>
        </div>
        {facets && (
          <FilterPanel
            facets={facets}
            chosen={chosen}
            onToggle={toggle}
            labels={{ brand: t('category.brand'), sizes: t('category.sizes'), finishes: t('category.finishes') }}
            pick={pick}
          />
        )}
        {chosenCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="filter-chips">
            <span className="text-sm font-semibold text-gray-700">{t('category.results', { count: number(list.data?.total ?? 0) })}</span>
            {[
              ...chosen.brands.map((v) => ['brand', 'brands', v]),
              ...chosen.sizes.map((v) => ['size', 'sizes', v]),
              ...chosen.finishes.map((v) => ['finish', 'finishes', v]),
            ].map(([param, kind, value]) => (
              <button key={param + value} type="button" onClick={() => toggle(param, value)} className="badge bg-primary/10 py-1 text-primary hover:bg-primary hover:text-white">
                <bdi>{labelOf(kind, value)}</bdi> ✕
              </button>
            ))}
            <button type="button" onClick={clearChoices} className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              {t('category.clearFilters')}
            </button>
          </div>
        )}
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.items.length ? (
          <ProductGrid products={list.data.items} />
        ) : (
          <EmptyState title={t('category.empty')} />
        )}
      </section>
    </div>
  );
}
