import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import ArchitectureDiagram from '../components/ArchitectureDiagram.jsx';
import { CASES, PRACTICES, REPO_URL, STACK, STATS } from '../data/engineering.js';

// «How it's built»: the production system behind this demo — its shape, the hard problems it solves and how each
// solution is proved. Every figure and excerpt comes from the private repository (see src/data/engineering.js).

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
      <p className="font-display text-3xl font-extrabold text-primary">{value}</p>
      <p className="mt-1 text-sm leading-snug text-gray-600">{label}</p>
    </div>
  );
}

function CaseStudy({ id, code, index }) {
  const { t } = useI18n();
  const k = (part) => t(`engineering.cases.${id}.${part}`);
  return (
    <details className="card group overflow-hidden" data-testid="case-study" open={index === 0}>
      <summary className="flex cursor-pointer list-none items-start gap-3 p-5 hover:bg-gray-50">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {index + 1}
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold text-gray-900">{k('title')}</span>
          <span className="mt-1 block text-gray-600">{k('problem')}</span>
        </span>
        <span className="mt-1 text-primary transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="grid gap-5 border-t border-gray-100 p-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-secondary">{t('engineering.howLabel')}</p>
          <ul className="mt-2 space-y-2 text-gray-700">
            {['s1', 's2', 's3'].map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{k(s)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-secondary">{t('engineering.proofLabel')}</p>
          <p className="mt-1 text-gray-700">{k('proof')}</p>
        </div>
        <figure className="min-w-0">
          <pre dir="ltr" className="max-h-96 overflow-auto rounded-xl bg-gray-900 p-4 text-left text-[12.5px] leading-relaxed text-gray-100">
            <code>{code.text}</code>
          </pre>
          <figcaption dir="ltr" className="mt-1.5 truncate text-left font-mono text-xs text-gray-500">
            {code.file}
          </figcaption>
        </figure>
      </div>
    </details>
  );
}

export default function Engineering() {
  const { t } = useI18n();
  return (
    <article className="mx-auto max-w-6xl space-y-14" data-testid="engineering-page">
      <header className="rounded-3xl bg-gradient-to-br from-primary-dark to-primary p-8 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/70">{t('engineering.kicker')}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">{t('engineering.title')}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/85">{t('engineering.lead')}</p>
        <p className="mt-4 text-sm text-white/70">{t('engineering.by')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#cases" className="rounded-lg bg-white px-4 py-2 font-semibold text-primary-dark hover:bg-white/90">
            {t('engineering.toCases')}
          </a>
          {REPO_URL && (
            <a href={`${REPO_URL}/blob/main/docs/ENGINEERING.md`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/40 px-4 py-2 font-semibold text-white hover:bg-white/10">
              {t('engineering.readOnGithub')}
            </a>
          )}
          <Link to="/" className="rounded-lg border border-white/40 px-4 py-2 font-semibold text-white hover:bg-white/10">
            {t('engineering.tryDemo')}
          </Link>
        </div>
      </header>

      <section aria-labelledby="eng-numbers">
        <h2 id="eng-numbers" className="sr-only">
          {t('engineering.numbersTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {STATS.map((s) => (
            <Stat key={s.key} value={s.value} label={t(`engineering.stats.${s.key}`)} />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">{t('engineering.numbersNote')}</p>
      </section>

      <section aria-labelledby="eng-arch" className="space-y-4">
        <h2 id="eng-arch" className="text-2xl font-bold">
          {t('engineering.archTitle')}
        </h2>
        <p className="max-w-3xl text-gray-700">{t('engineering.archLead')}</p>
        <ArchitectureDiagram />
        <ul className="grid gap-3 md:grid-cols-2">
          {['p1', 'p2', 'p3', 'p4'].map((p) => (
            <li key={p} className="rounded-xl bg-primary/5 p-4 text-gray-800">
              {t(`engineering.archPoints.${p}`)}
            </li>
          ))}
        </ul>
      </section>

      <section id="cases" aria-labelledby="eng-cases" className="scroll-mt-24 space-y-4">
        <h2 id="eng-cases" className="text-2xl font-bold">
          {t('engineering.casesTitle')}
        </h2>
        <p className="max-w-3xl text-gray-700">{t('engineering.casesLead')}</p>
        <div className="space-y-3">
          {CASES.map((c, i) => (
            <CaseStudy key={c.id} id={c.id} code={c.code} index={i} />
          ))}
        </div>
      </section>

      <section aria-labelledby="eng-practices" className="space-y-4">
        <h2 id="eng-practices" className="text-2xl font-bold">
          {t('engineering.practicesTitle')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PRACTICES.map((p) => (
            <div key={p} className="card p-5">
              <p className="font-bold text-gray-900">{t(`engineering.practices.${p}.title`)}</p>
              <p className="mt-2 text-gray-700">{t(`engineering.practices.${p}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="eng-stack" className="space-y-3">
        <h2 id="eng-stack" className="text-2xl font-bold">
          {t('engineering.stackTitle')}
        </h2>
        <div className="space-y-3">
          {STACK.map((g) => (
            <div key={g.key} className="flex flex-wrap items-baseline gap-2">
              <span className="w-28 shrink-0 text-sm font-semibold text-gray-500">{t(`engineering.stack.${g.key}`)}</span>
              {g.items.map((item) => (
                <span key={item} dir="ltr" className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-800">
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-gray-100 p-4 text-sm text-gray-600">{t('engineering.note')}</p>
    </article>
  );
}
