import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import ProductArt from '../components/ProductArt.jsx';
import ProductCard, { ProductGrid } from '../components/ProductCard.jsx';
import ReelStrip from '../components/ReelStrip.jsx';
import { ErrorState, Loading, SectionTitle } from '../components/ui.jsx';

function Scenario({ n, to, children }) {
  return (
    <li>
      <Link to={to} className="flex items-start gap-3 rounded-lg p-2 hover:bg-white/60">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{n}</span>
        <span className="text-sm text-gray-800">{children}</span>
      </Link>
    </li>
  );
}

export default function Home() {
  const { t, pick, number } = useI18n();
  const { data, error, loading, reload } = useApi(() => api.getHome(), []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { promotion, sections, featured, bundles, stats } = data;
  const mira = featured.find((p) => p.modelCode === 'MIRA-B') || featured[0];

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-primary-tint text-white shadow-lg">
        <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="text-2xl leading-tight text-white sm:text-4xl">{t('home.heroTitle')}</h1>
            <p className="mt-4 max-w-2xl text-sm text-white/85 sm:text-base">{t('home.heroText')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/categories" className="btn bg-white text-primary hover:bg-white/90">
                {t('home.shopNow')}
              </Link>
              <Link to="/admin" className="btn border border-white/40 text-white hover:bg-white/10">
                {t('home.openAdmin')}
              </Link>
            </div>
            <dl className="mt-8 flex flex-wrap gap-6 text-sm">
              {[
                [stats.products, t('home.statsProducts')],
                [stats.categories, t('home.statsCategories')],
                [stats.brands, t('home.statsBrands')],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block text-2xl font-bold text-white">{number(value)}</span>
                    <span className="text-white/75">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mx-auto hidden w-full max-w-xs rounded-2xl bg-white/95 p-4 shadow-inner md:block">
            <ProductArt art={{ kind: 'set', shape: 'bath' }} className="h-full w-full" label={t('product.illustration')} />
          </div>
        </div>
      </section>

      {promotion && (
        <section className="overflow-hidden rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary/10 via-white to-white">
          <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
            <span className="badge bg-secondary text-white">{t('home.promoBadge')}</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl text-gray-900">{pick(promotion.title)}</h2>
              <p className="text-sm text-gray-600">{pick(promotion.text)}</p>
            </div>
            {promotion.category && (
              <Link to={`/c/${promotion.category.slug}?brand=${promotion.appliesTo.brandCode}`} className="btn-secondary">
                {t('home.promoCta')}
              </Link>
            )}
          </div>
          <div className="scrollbar-none flex gap-3 overflow-x-auto px-5 pb-5 sm:px-6">
            {promotion.products.map((p) => (
              <div key={p.id} className="w-44 shrink-0 sm:w-52">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      <ReelStrip />

      <section>
        <SectionTitle
          action={
            <Link to="/categories" className="link text-sm">
              {t('common.seeAll')}
            </Link>
          }
        >
          {t('home.sections')}
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {sections.map((c) => (
            <Link key={c.id} to={`/c/${c.slug}`} className="card group flex flex-col items-center p-4 text-center transition-shadow hover:shadow-md">
              <ProductArt art={c.art} className="h-20 w-20 transition-transform group-hover:scale-105 sm:h-24 sm:w-24" label={pick(c.name)} />
              <span className="mt-2 text-sm font-semibold text-gray-900">{pick(c.name)}</span>
              <span className="text-xs text-gray-500">{t('common.products', { count: number(c.productCount) })}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card bg-gradient-to-br from-primary/5 to-white p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl">{t('home.scenariosTitle')}</h2>
        <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          <Scenario n={1} to={`/search?q=${encodeURIComponent('قاعده')}`}>
            {t('home.scenarios.search')}
          </Scenario>
          <Scenario n={2} to={mira ? `/p/${mira.slug}` : '/categories'}>
            {t('home.scenarios.variant')}
          </Scenario>
          <Scenario n={3} to="/cart">
            {t('home.scenarios.checkout')}
          </Scenario>
          <Scenario n={4} to="/admin/products">
            {t('home.scenarios.bulkMove')}
          </Scenario>
          <Scenario n={5} to="/admin/stock">
            {t('home.scenarios.stock')}
          </Scenario>
          <Scenario n={6} to="/admin/orders">
            {t('home.scenarios.cashier')}
          </Scenario>
        </ol>
      </section>

      <section>
        <SectionTitle>{t('home.featured')}</SectionTitle>
        <ProductGrid products={featured} />
      </section>

      <section>
        <SectionTitle>{t('home.bundles')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {bundles.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
