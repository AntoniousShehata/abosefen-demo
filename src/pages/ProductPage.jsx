import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ProductArt from '../components/ProductArt.jsx';
import ProductCard from '../components/ProductCard.jsx';
import NotifyWhenBack from '../components/NotifyWhenBack.jsx';
import { EmptyState, ErrorState, Loading, Price, QuantityStepper, SectionTitle, StockBadge } from '../components/ui.jsx';
import { errorText } from '../lib/errorText.js';

function uniqueBy(list, key) {
  const seen = new Map();
  for (const item of list) if (item[key] && !seen.has(item[key])) seen.set(item[key], item);
  return [...seen.values()];
}

export default function ProductPage() {
  const { slug } = useParams();
  const { t, pick, money, number, country } = useI18n();
  const toast = useToast();
  const { data: product, error, loading, reload } = useApi(() => api.getProduct(slug), [slug]);

  const [finish, setFinish] = useState(null);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  // Start on the first option that is in stock (or the first one) whenever another product opens.
  const productId = product?.id;
  useEffect(() => {
    if (!product) return;
    const first = product.variants.find((v) => v.inStock) || product.variants[0];
    setFinish(first?.colorCode || null);
    setSize(first?.sizeCode || null);
    setQuantity(1);
    setProblem('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const finishes = useMemo(() => uniqueBy(product?.variants || [], 'colorCode'), [product]);
  const sizes = useMemo(() => uniqueBy(product?.variants || [], 'sizeCode'), [product]);

  if (loading && !product) return <Loading />;
  if (error) {
    return error.code === 'productNotFound' ? (
      <EmptyState title={t('product.notFound')}>
        <Link to="/categories" className="btn-primary">
          {t('nav.allCategories')}
        </Link>
      </EmptyState>
    ) : (
      <ErrorState error={error} onRetry={reload} />
    );
  }

  const hasVariants = product.variants.length > 0;
  const variantFor = (colorCode, sizeCode) =>
    product.variants.find((v) => (v.colorCode || null) === (colorCode || null) && (v.sizeCode || null) === (sizeCode || null)) || null;
  const selected = hasVariants ? variantFor(finish, size) : null;
  const pricing = selected ? selected.pricing : product.pricing;
  const stock = selected ? selected.stockQuantity : product.inventory.stockQuantity;
  const canBuy = (!hasVariants || selected) && stock > 0;

  const chooseFinish = (code) => {
    setFinish(code);
    if (sizes.length && !variantFor(code, size)) setSize(product.variants.find((v) => v.colorCode === code)?.sizeCode || null);
    setProblem('');
  };

  const add = async () => {
    setBusy(true);
    setProblem('');
    try {
      await api.addToCart({ productId: product.id, variantId: selected?.id || null, quantity });
      toast.show(t('product.added'), {
        action: (
          <Link to="/cart" className="rounded-md bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25">
            {t('product.viewCart')}
          </Link>
        ),
      });
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Breadcrumb path={product.categoryPath} current={pick(product.name)} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="card relative aspect-square bg-gradient-to-br from-gray-50 to-primary/5 p-6 sm:p-10">
            <ProductArt art={product.art} color={selected?.colorHex} className="h-full w-full" label={pick(product.name)} />
            {pricing.isOnSale && (
              <span className="badge absolute start-3 top-3 bg-secondary text-white">{t('product.save', { percent: pricing.discountPercentage })}</span>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">{t('product.illustration')}</p>
        </div>

        <div>
          {product.brand && <p className="text-sm font-semibold uppercase tracking-wide text-primary">{pick(product.brand.name)}</p>}
          <h1 className="mt-1 text-2xl leading-snug sm:text-3xl" data-testid="product-title">
            {pick(product.name)}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t('product.sku')}: <span className="num-ltr font-mono text-gray-700">{selected?.sku || product.sku}</span>
            {product.countryOfOrigin && (
              <>
                {' · '}
                {t('product.origin')}: {country(product.countryOfOrigin)}
              </>
            )}
          </p>

          <div className="mt-5 space-y-2">
            <Price pricing={pricing} size="lg" showFrom={hasVariants && !selected} />
            {product.promotion && (
              <p className="text-sm font-medium text-secondary">
                {t('home.promoBadge')}: {pick(product.promotion.title)}
              </p>
            )}
            <p className="text-xs text-gray-500">{t('product.vatNote')}</p>
          </div>

          {finishes.length > 0 && (
            <fieldset className="mt-6">
              <legend className="label">
                {t('product.finish')}: <span className="font-normal text-gray-800">{pick(finishes.find((f) => f.colorCode === finish)?.colorName)}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {finishes.map((f) => {
                  const active = f.colorCode === finish;
                  const anyInStock = product.variants.some((v) => v.colorCode === f.colorCode && v.inStock);
                  return (
                    <button
                      key={f.colorCode}
                      type="button"
                      onClick={() => chooseFinish(f.colorCode)}
                      aria-pressed={active}
                      title={pick(f.colorName)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                        active ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-gray-300 hover:border-gray-400'
                      } ${anyInStock ? '' : 'opacity-60'}`}
                    >
                      <span className="h-5 w-5 rounded-full border border-gray-300" style={{ backgroundColor: f.colorHex }} />
                      <span className={anyInStock ? '' : 'line-through'}>{pick(f.colorName)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="mt-5">
              <legend className="label">{t('product.size')}</legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = variantFor(finishes.length ? finish : null, s.sizeCode);
                  const active = s.sizeCode === size;
                  return (
                    <button
                      key={s.sizeCode}
                      type="button"
                      disabled={!v}
                      onClick={() => {
                        setSize(s.sizeCode);
                        setProblem('');
                      }}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        active ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white hover:border-gray-400'
                      } ${v && !v.inStock ? 'line-through' : ''}`}
                    >
                      <span className="num-ltr">{pick(s.sizeLabel)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StockBadge quantity={stock} threshold={product.inventory.lowStockThreshold} />
          </div>
          {/* production's STK-13: told when this option is back */}
          {(!hasVariants || selected) && stock <= 0 && !product.bundle && (
            <NotifyWhenBack key={selected?.id || product.id} productId={product.id} variantId={selected?.id || null} />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{t('product.quantity')}</span>
              <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, stock)} disabled={!canBuy} />
            </label>
            <button type="button" className="btn-primary px-6 py-2.5" onClick={add} disabled={!canBuy || busy} data-testid="add-to-cart">
              {busy ? t('product.adding') : t('product.addToCart')}
            </button>
          </div>
          {problem && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {problem}
            </p>
          )}

          {product.bundle && (
            <section className="mt-8 rounded-xl border border-primary/15 bg-primary/5 p-4">
              <h2 className="text-base">{t('product.setContains')}</h2>
              <ul className="mt-3 divide-y divide-primary/10">
                {product.bundle.components.map((c) => (
                  <li key={`${c.productId}-${c.variantId}`} className="flex items-center gap-3 py-2">
                    <ProductArt art={c.art} className="h-12 w-12 shrink-0 rounded-lg bg-white p-1" label={pick(c.name)} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/p/${c.slug}`} className="link text-sm font-medium text-gray-800">
                        {pick(c.name)}
                      </Link>
                      {c.variantLabel && <p className="text-xs text-gray-500">{pick(c.variantLabel)}</p>}
                    </div>
                    <span className="num-ltr text-sm text-gray-600">× {number(c.quantity)}</span>
                    <span className="w-24 text-end text-sm text-gray-700">{money(c.unitPrice * c.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-gray-600">
                  {t('product.partsTotal')}: <span className="line-through">{money(product.bundle.partsTotal)}</span>
                </span>
                <span className="font-semibold text-secondary">{t('product.youSave', { amount: money(product.bundle.savings) })}</span>
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-base">{t('product.description')}</h2>
            <p className="mt-2 leading-relaxed text-gray-700">{pick(product.description)}</p>
          </section>

          {product.specifications.length > 0 && (
            <section className="mt-6">
              <h2 className="text-base">{t('product.specifications')}</h2>
              <table className="mt-2 w-full overflow-hidden rounded-lg border border-gray-200 text-sm">
                <tbody>
                  {product.specifications.map((s) => (
                    <tr key={s.key} className="odd:bg-gray-50">
                      <th scope="row" className="w-2/5 px-3 py-2 text-start font-medium text-gray-600">
                        {pick(s.label)}
                      </th>
                      <td className="px-3 py-2 text-gray-800">{pick(s.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>

      {product.moreFromBrand.length > 0 && (
        <section className="mt-12">
          <SectionTitle>{t('product.moreFromBrand', { brand: pick(product.brand?.name) })}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {product.moreFromBrand.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
