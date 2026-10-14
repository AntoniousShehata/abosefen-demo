import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Home › Department › Sub-category › … — EVERY level is a link, the current one included
 * (it reloads its own list), so a visitor can always climb back up.
 */
export default function Breadcrumb({ path = [], current = null }) {
  const { t, pick, isRtl } = useI18n();
  const sep = <span className="text-gray-300" aria-hidden="true">{isRtl ? '‹' : '›'}</span>;
  return (
    <nav aria-label={t('nav.breadcrumb')} className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500">
        <li>
          <Link to="/" className="link text-gray-600">
            {t('nav.home')}
          </Link>
        </li>
        <li className="flex items-center gap-2">
          {sep}
          <Link to="/categories" className="link text-gray-600">
            {t('nav.allCategories')}
          </Link>
        </li>
        {path.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            {sep}
            <Link to={`/c/${c.slug}`} className="link text-gray-600">
              {pick(c.name)}
            </Link>
          </li>
        ))}
        {current && (
          <li className="flex items-center gap-2">
            {sep}
            <span className="font-medium text-gray-800" aria-current="page">
              {current}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
