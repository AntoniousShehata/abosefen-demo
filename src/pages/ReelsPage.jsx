import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { PRODUCTS } from '../data/catalog.js';
import { REELS, clock, productAt, publicCount } from '../data/reels.js';
import ReelScene from '../components/ReelScene.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorState, Loading } from '../components/ui.jsx';

// The demo's version of production's reels (VID-1): one video a screen, swiped up (or the arrows) for the next; it
// starts without sound and a tap turns it on; a double tap likes it — once. What production adds to the usual reels
// app is here too: the product in the video pops up ON the video at its second, and «Products in this video» lists them
// with the shop's own card. Views and likes show from 100 views on. The «videos» are drawings that move.

const slugOf = (modelCode) => PRODUCTS.find((p) => p.modelCode === modelCode)?.slug;

function Slide({ reel, products, active, muted, onMute, liked, onLike, onProducts }) {
  const { t, pick, number } = useI18n();
  const [time, setTime] = useState(0);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const timer = useRef(null);

  // the clock runs while this reel is on screen, round and round, as a video loops
  useEffect(() => {
    if (!active) { setTime(0); return undefined; }
    const started = Date.now() - time * 1000;
    const id = setInterval(() => setTime(((Date.now() - started) / 1000) % reel.seconds), 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reel.seconds]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      clearTimeout(timer.current);
      lastTap.current = 0;
      onLike();
      setBurst((n) => n + 1);
      return;
    }
    lastTap.current = now;
    timer.current = setTimeout(onMute, 300);
  };

  const shown = productAt(reel.products, time);
  const shownCard = shown ? products.find((p) => p.modelCode === shown.modelCode) : null;
  const views = publicCount(reel.views, reel.views);
  const likes = publicCount(reel.likes + (liked ? 1 : 0), reel.views);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black lg:aspect-[9/16] lg:h-[calc(100dvh-2.5rem)] lg:w-auto lg:rounded-2xl">
      <ReelScene scene={reel.scene} playing={active} className="absolute inset-0 h-full w-full" />
      <button type="button" onClick={tap} className="absolute inset-0 h-full w-full" aria-label={muted ? t('reels.sound.turnOn') : t('reels.sound.turnOff')} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      {burst > 0 && <span key={burst} className="reel-heart pointer-events-none absolute inset-0 grid place-items-center text-8xl text-[#F0435A]" aria-hidden="true">♥</span>}

      <button type="button" onClick={onMute} className="absolute start-3 top-14 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white lg:top-3">
        {muted ? t('reels.sound.off') : t('reels.sound.on')}
      </button>

      <div className="absolute bottom-36 end-2 flex flex-col items-center gap-1 text-white lg:hidden">
        <button type="button" onClick={onLike} aria-pressed={liked} aria-label={t('reels.like')}
          className={`grid h-12 w-12 place-items-center rounded-full bg-black/40 text-2xl ${liked ? 'text-[#F0435A]' : ''}`}>♥</button>
        {likes != null && <span className="text-xs font-bold">{number(likes)}</span>}
      </div>

      <div className="absolute inset-x-3 bottom-4 flex flex-col items-start gap-2 pe-14 text-white lg:pe-0">
        {shownCard && (
          <button type="button" onClick={() => onProducts(shownCard.modelCode)} data-testid="reel-now"
            className="reel-now flex w-full max-w-sm items-center gap-2 rounded-xl bg-white/95 p-2 text-start text-gray-900 shadow-lg">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-secondary">{t('reels.now')}</span>
              <span className="block truncate text-sm font-bold">{pick(shownCard.name)}</span>
            </span>
            <span className="text-lg font-bold text-primary" aria-hidden="true">›</span>
          </button>
        )}
        {views != null && <span className="text-xs font-semibold text-white/90">{t('reels.views', { count: number(views) })}</span>}
        <p className="max-w-md text-[15px] font-bold leading-snug lg:hidden">{pick(reel.title)}</p>
        <button type="button" onClick={() => onProducts(null)}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary-dark shadow-lg lg:hidden">
          {t('reels.products.button')}
          <span className="rounded-full bg-primary px-1.5 text-xs leading-6 text-white">{reel.products.length}</span>
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
        <div className="h-full bg-white" style={{ width: `${(time / reel.seconds) * 100}%` }} />
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const { t, pick } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const scroller = useRef(null);
  const slides = useRef([]);
  const [first] = useState(() => Math.max(0, REELS.findIndex((r) => r.id === id)));
  const [active, setActive] = useState(first);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState({});
  const [sheet, setSheet] = useState(null);   // { highlight } while «Products in this video» is open on a phone

  // every product of every reel, as the shop's own cards
  const slugs = useMemo(() => [...new Set(REELS.flatMap((r) => r.products.map((p) => slugOf(p.modelCode))))].filter(Boolean), []);
  const { data, error, loading, reload } = useApi(() => Promise.all(slugs.map((slug) => api.getProduct(slug))), [slugs]);
  const productsOf = useCallback((reel) => (data || []).filter((p) => reel.products.some((x) => x.modelCode === p.modelCode)), [data]);

  useEffect(() => { slides.current[first]?.scrollIntoView?.({ block: 'start' }); }, [first, data]);

  useEffect(() => {
    const root = scroller.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number(e.target.dataset.index));
    }, { root, threshold: [0.6] });
    slides.current.forEach((s) => s && watch.observe(s));
    return () => watch.disconnect();
  }, [data]);

  useEffect(() => { setSheet(null); }, [active]);

  const go = (i) => { if (i >= 0 && i < REELS.length) slides.current[i]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); };
  const close = () => navigate(-1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); go(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(active - 1); }
      else if (e.key === 'Escape') { if (sheet) setSheet(null); else close(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const reel = REELS[active];
  return (
    <div className="fixed inset-0 z-50 bg-[#0B0B0D] text-white" role="dialog" aria-modal="true" aria-label={t('reels.title')} data-testid="reels-player">
      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-scroll" style={{ scrollbarWidth: 'none' }}>
        {REELS.map((r, i) => (
          <section key={r.id} ref={(el) => { slides.current[i] = el; }} data-index={i} className="flex h-[100dvh] snap-start items-center justify-center">
            <div className="flex h-full w-full items-center justify-center lg:w-auto lg:flex-1">
              <Slide reel={r} products={productsOf(r)} active={i === active} muted={muted} onMute={() => setMuted((m) => !m)}
                liked={!!liked[r.id]} onLike={() => setLiked((all) => ({ ...all, [r.id]: true }))}
                onProducts={(highlight) => setSheet({ highlight })} />
            </div>
            <aside className="hidden h-[calc(100dvh-2.5rem)] w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-gray-900 lg:me-4 lg:flex">
              <div className="space-y-1 border-b border-gray-100 p-4">
                <h2 className="text-base font-bold leading-snug">{pick(r.title)}</h2>
                <p className="text-sm text-gray-600">{pick(r.text)}</p>
                <p className="text-xs text-gray-500">{clock(r.seconds)}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-500">{t('reels.products.title')}</h3>
                <div className="grid grid-cols-2 gap-2">{productsOf(r).map((p) => <ProductCard key={p.id} product={p} />)}</div>
              </div>
            </aside>
          </section>
        ))}
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
        <span className="text-base font-bold drop-shadow lg:hidden">{t('reels.title')} · {active + 1} / {REELS.length}</span>
        <button type="button" onClick={close} aria-label={t('reels.close')} className="grid h-10 w-10 place-items-center rounded-full bg-black/45">✕</button>
      </div>
      <div className="absolute start-4 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label={t('reels.previous')} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 disabled:opacity-30">↑</button>
        <button type="button" onClick={() => go(active + 1)} disabled={active === REELS.length - 1} aria-label={t('reels.next')} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 disabled:opacity-30">↓</button>
      </div>

      {sheet && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/40 lg:hidden" onClick={() => setSheet(null)}>
          <div className="max-h-[78dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-3 text-gray-900" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label={t('reels.products.title')} data-testid="reel-products">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">{t('reels.products.title')}</h2>
              <button type="button" onClick={() => setSheet(null)} aria-label={t('reels.close')} className="grid h-9 w-9 place-items-center rounded-full border border-gray-200">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {productsOf(reel).map((p) => (
                <div key={p.id} className={sheet.highlight === p.modelCode ? 'rounded-xl ring-2 ring-primary' : ''}><ProductCard product={p} /></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
