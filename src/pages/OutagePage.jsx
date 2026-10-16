import { Link } from 'react-router-dom';
import { LANGUAGES, useI18n } from '../i18n/I18nProvider.jsx';
import Logo from '../components/Logo.jsx';

// The demo's own version of production's paused-site page (OUT-1 / OUT-2): what a visitor sees when the shop pauses its
// site, or when nothing of the shop answers and Cloudflare shows it. Production offers Arabic, English and German on it;
// the demo — like the rest of the demo — English (first) and German. The phones are invented and dial nothing.
const PHONES = { mobile: '+20 100 000 0000', landline: '+20 2 0000 0000' };

export default function OutagePage() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="mx-auto max-w-xl py-6">
      <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="outage-note">{t('outage.note')}</p>
      <main className="rounded-2xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-gray-100" aria-labelledby="outage-title">
        <nav className="mb-4 flex justify-center gap-2" aria-label={t('outage.language')} data-testid="outage-languages">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={lang === l.code}
              className={`min-h-[36px] rounded-full border px-4 text-sm ${lang === l.code ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
              {l.label}
            </button>
          ))}
        </nav>
        <Logo className="mx-auto h-20 w-20" />
        <p className="mt-3 text-lg font-bold text-primary">{t('app.name')}</p>
        <h1 id="outage-title" className="mt-4 text-2xl font-bold text-primary">{t('outage.title')}</h1>
        <p className="mt-2 text-gray-700">{t('outage.paused')}</p>
        <p className="mt-2 text-gray-700">{t('outage.needSomething')}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" disabled title={t('outage.invented')} className="min-w-[150px] rounded-xl bg-primary px-5 py-3 font-bold text-white opacity-80">
            {t('outage.call')}
          </button>
          <button type="button" disabled title={t('outage.invented')} className="min-w-[150px] rounded-xl border-2 border-primary bg-white px-5 py-3 font-bold text-primary opacity-80">
            WhatsApp
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          {t('outage.mobile')} <span className="num-ltr" dir="ltr">{PHONES.mobile}</span> · {t('outage.landline')} <span className="num-ltr" dir="ltr">{PHONES.landline}</span>
        </p>
        <p className="text-sm text-gray-600">{t('outage.address')}</p>
      </main>
      <p className="mt-4 text-center text-sm">
        <Link to="/engineering" className="text-primary hover:underline">{t('outage.back')}</Link>
      </p>
    </div>
  );
}
