import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import Logo from './Logo.jsx';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 bg-primary-dark text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Logo />
            <span className="text-lg font-bold">{t('app.name')}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{t('footer.about')}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">{t('banner.text')}</p>
          <p className="mt-2 leading-relaxed">{t('footer.noNetwork')}</p>
          <p className="mt-2 leading-relaxed">{t('checkout.simulation')}</p>
        </div>
        <div className="text-sm">
          <ul className="space-y-2">
            <li>
              <Link to="/categories" className="hover:text-white">
                {t('nav.allCategories')}
              </Link>
            </li>
            <li>
              <Link to="/signin" className="hover:text-white">
                {t('auth.title')}
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-white">
                {t('nav.admin')}
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-white/60">{t('footer.builtWith')}</p>
        </div>
      </div>
    </footer>
  );
}
