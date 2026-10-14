import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import ProductArt from './ProductArt.jsx';
import { Price, StockBadge } from './ui.jsx';

export default function ProductCard({ product }) {
  const { t, pick } = useI18n();
  const finishes = new Set(product.variants.map((v) => v.colorCode).filter(Boolean));
  const sizes = new Set(product.variants.map((v) => v.sizeCode).filter(Boolean));
  const swatches = [...new Map(product.variants.filter((v) => v.colorHex).map((v) => [v.colorCode, v.colorHex])).values()];

  return (
    <Link
      to={`/p/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md focus-visible:shadow-md"
      data-testid="product-card"
    >
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-primary/5 p-4">
        <ProductArt art={product.art} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" label={pick(product.name)} />
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {product.pricing.isOnSale && (
            <span className="badge bg-secondary text-white">{t('product.save', { percent: product.pricing.discountPercentage })}</span>
          )}
          {product.productType === 'bundle' && <span className="badge bg-primary text-white">{t('common.set')}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {product.brand && <span className="text-xs font-semibold uppercase tracking-wide text-primary">{pick(product.brand.name)}</span>}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-gray-900">{pick(product.name)}</h3>
        {swatches.length > 1 && (
          <div className="flex items-center gap-1" aria-label={t('product.finishes', { count: finishes.size })}>
            {swatches.map((hex) => (
              <span key={hex} className="h-3.5 w-3.5 rounded-full border border-gray-300" style={{ backgroundColor: hex }} />
            ))}
          </div>
        )}
        {swatches.length <= 1 && sizes.size > 1 && <span className="text-xs text-gray-500">{t('product.options', { count: sizes.size })}</span>}
        <div className="mt-auto space-y-1.5">
          <Price pricing={product.pricing} showFrom={product.variantCount > 1} />
          <StockBadge quantity={product.inventory.stockQuantity} threshold={product.inventory.lowStockThreshold} />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
