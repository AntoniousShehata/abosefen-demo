import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { ErrorState, Loading } from '../components/ui.jsx';

export default function AllCategories() {
  const { t, pick, number } = useI18n();
  const { data, error, loading, reload } = useApi(() => api.listCategories(), []);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const childrenOf = (id) => data.filter((c) => c.parentCategoryId === id);
  const roots = childrenOf(null);

  const Branch = ({ id }) => {
    const kids = childrenOf(id);
    if (!kids.length) return null;
    return (
      <ul className="ms-4 mt-1 space-y-1 border-s border-gray-100 ps-3">
        {kids.map((k) => (
          <li key={k.id}>
            <Link to={`/c/${k.slug}`} className="link text-sm text-gray-700">
              {pick(k.name)}
            </Link>
            <span className="text-xs text-gray-400"> ({number(k.productCount)})</span>
            <Branch id={k.id} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl sm:text-3xl">{t('category.allTitle')}</h1>
      <p className="mt-2 max-w-3xl text-gray-600">{t('category.allText')}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((root) => (
          <section key={root.id} className="card p-5">
            <Link to={`/c/${root.slug}`} className="group flex items-center gap-4">
              <ProductArt art={root.art} className="h-16 w-16 shrink-0" label={pick(root.name)} />
              <span>
                <span className="block text-lg font-bold text-gray-900 group-hover:text-primary">{pick(root.name)}</span>
                <span className="text-sm text-gray-500">{t('common.products', { count: number(root.productCount) })}</span>
              </span>
            </Link>
            <ul className="mt-4 space-y-1.5">
              {childrenOf(root.id).map((c) => (
                <li key={c.id}>
                  <Link to={`/c/${c.slug}`} className="link font-medium text-gray-800">
                    {pick(c.name)}
                  </Link>
                  <span className="text-xs text-gray-400"> ({number(c.productCount)})</span>
                  <Branch id={c.id} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
