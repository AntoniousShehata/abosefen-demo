import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/ui.jsx';

export default function CategoryPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') || 'featured';
  const brand = params.get('brand') || '';
  const { t, pick, number, lang } = useI18n();

  const head = useApi(() => api.getCategory(slug), [slug]);
  const categoryId = head.data?.category.id;
  const list = useApi(
    () => (categoryId ? api.listProducts({ categoryId, brandCode: brand || null, sort, lang }) : Promise.resolve(null)),
    [categoryId, brand, sort, lang],
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
            <span className="label">{t('category.brand')}</span>
            <select className="input py-1.5" value={brand} onChange={(e) => setParam('brand', e.target.value)}>
              <option value="">{t('category.allBrands')}</option>
              {(list.data?.brands || []).map((b) => (
                <option key={b.code} value={b.code}>
                  {pick(b.name)}
                </option>
              ))}
            </select>
          </label>
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
