import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import DemoBanner from './DemoBanner.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* not available in tests */
    }
  }, [pathname]);
  return null;
}

export default function Layout() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <button
        type="button"
        onClick={() => document.getElementById('main')?.focus()}
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2"
      >
        {t('app.skipToContent')}
      </button>
      <ScrollToTop />
      <DemoBanner />
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
