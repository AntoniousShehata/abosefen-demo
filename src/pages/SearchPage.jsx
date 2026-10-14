import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/ui.jsx';
import { queryWords } from '../lib/text.js';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const { t, pick, number, lang } = useI18n();
  const enough = queryWords(q).length > 0 && q.length >= 2;
  const { data, error, loading, reload } = useApi(() => (enough ? api.search(q, { lang }) : Promise.resolve(null)), [q, lang]);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl">{q ? t('search.resultsFor', { q }) : t('search.title')}</h1>
      <p className="mt-2 max-w-3xl text-sm text-gray-500">{t('search.tolerant')}</p>

      {!enough ? (
        <EmptyState title={t('search.startTyping')} />
      ) : loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          {data.categories.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-gray-600">{t('search.categoriesFound')}</h2>
              <div className="flex flex-wrap gap-2">
                {data.categories.map((c) => (
                  <Link key={c.id} to={`/c/${c.slug}`} className="badge bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/15">
                    {pick(c.name)} · {number(c.productCount)}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <p className="mb-4 mt-6 text-sm font-semibold text-gray-700" data-testid="search-count">
            {t('search.count', { count: number(data.total) })}
          </p>
          {data.items.length ? (
            <ProductGrid products={data.items} />
          ) : (
            <EmptyState title={t('search.empty', { q })} text={t('search.emptyHint')}>
              <Link to="/categories" className="btn-primary">
                {t('nav.allCategories')}
              </Link>
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
}
