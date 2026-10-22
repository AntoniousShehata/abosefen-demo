import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { REELS, clock, publicCount } from '../data/reels.js';
import ReelScene from './ReelScene.jsx';
import { SectionTitle } from './ui.jsx';

// The home page's strip of reels (production's VID-1): a cover each, its length, its views once it has a hundred, and
// how many products are in it. A press opens the full-screen player at that reel.
export default function ReelStrip() {
  const { t, pick, number } = useI18n();
  return (
    <section aria-labelledby="reels-strip" data-testid="reel-strip">
      <SectionTitle action={<Link to="/reels" className="text-sm font-semibold text-primary hover:underline">{t('reels.strip.all')}</Link>}>
        <span id="reels-strip">{t('reels.strip.title')}</span>
        <span className="mt-0.5 block text-sm font-normal text-gray-500">{t('reels.strip.subtitle')}</span>
      </SectionTitle>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {REELS.map((reel) => {
          const views = publicCount(reel.views, reel.views);
          return (
            <Link key={reel.id} to={`/reels/${reel.id}`} className="group w-32 shrink-0 sm:w-36">
              <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-gray-900 text-white">
                <ReelScene scene={reel.scene} className="h-full w-full" />
                <span className="absolute start-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[11px] font-bold">{clock(reel.seconds)}</span>
                {views != null && <span className="absolute bottom-1.5 start-1.5 text-[11px] font-bold">{t('reels.views', { count: number(views) })}</span>}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-primary transition-transform group-hover:scale-110" aria-hidden="true">▶</span>
                </span>
              </span>
              <span className="mt-1.5 block line-clamp-2 text-xs font-semibold leading-snug text-gray-900">{pick(reel.title)}</span>
              <span className="block text-[11px] text-gray-500">{t('reels.products.count', { count: reel.products.length })}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
