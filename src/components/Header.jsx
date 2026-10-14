import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { LANGUAGES, useI18n } from '../i18n/I18nProvider.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Logo from './Logo.jsx';

function SearchBox({ className = '' }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const current = new URLSearchParams(location.search).get('q') || '';
  const [q, setQ] = useState(current);
  useEffect(() => setQ(current), [current]);

  return (
    <form
      role="search"
      className={`flex w-full ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('search.placeholder')}
        aria-label={t('common.search')}
        className="min-w-0 flex-1 rounded-s-lg border-0 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary"
      />
      <button type="submit" className="rounded-e-lg bg-secondary px-4 text-white hover:brightness-95" aria-label={t('common.search')}>
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8.5 3a5.5 5.5 0 1 0 3.4 9.8l3.6 3.7a1 1 0 0 0 1.5-1.4l-3.7-3.6A5.5 5.5 0 0 0 8.5 3zM5 8.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" clipRule="evenodd" />
        </svg>
      </button>
    </form>
  );
}

function LanguagePicker() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="relative">
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="cursor-pointer appearance-none rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/60 sm:text-sm"
        data-testid="language-picker"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-gray-900">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AccountMenu() {
  const { t, pick } = useI18n();
  const { user, signOut, isStaff } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) {
    return (
      <Link to="/signin" className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm">
        {t('nav.signIn')}
      </Link>
    );
  }
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0H4z" />
          </svg>
        </span>
        <span className="hidden max-w-[10rem] truncate lg:inline">{pick(user.displayName)}</span>
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-30 mt-2 w-60 animate-fade-in rounded-xl border border-gray-100 bg-white p-2 text-sm text-gray-700 shadow-lg">
          <div className="border-b border-gray-100 px-3 pb-2">
            <p className="font-semibold text-gray-900">{pick(user.displayName)}</p>
            <p className="num-ltr text-xs text-gray-500">{user.email}</p>
            <p className="mt-1 text-xs text-gray-500">{t('auth.currentRole', { role: t(`auth.roles.${user.role}`) })}</p>
          </div>
          <Link role="menuitem" to="/my-orders" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
            {t('nav.myOrders')}
          </Link>
          {isStaff && (
            <Link role="menuitem" to="/admin" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
              {t('nav.admin')}
            </Link>
          )}
          <Link role="menuitem" to="/signin" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
            {t('auth.title')}
          </Link>
          <button
            role="menuitem"
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-start text-red-600 hover:bg-red-50"
            onClick={async () => {
              setOpen(false);
              await signOut();
              toast.show(t('auth.signedOut'));
              navigate('/');
            }}
          >
            {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

function CartLink() {
  const { t, number } = useI18n();
  const { data } = useApi(() => api.getCart(), []);
  const count = data?.itemCount || 0;
  return (
    <Link to="/cart" className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-white hover:bg-white/10" aria-label={`${t('nav.cart')} (${count})`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">{t('nav.cart')}</span>
      {count > 0 && (
        <span className="num-ltr absolute -top-1 start-5 min-w-[1.25rem] rounded-full bg-secondary px-1 text-center text-xs font-bold leading-5 text-white" data-testid="cart-count">
          {number(count)}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const { t, pick } = useI18n();
  const { isStaff } = useSession();
  const { data: sections } = useApi(() => api.listCategories(), []);
  const top = (sections || []).filter((c) => !c.parentCategoryId);
  const navClass = ({ isActive }) =>
    `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'}`;

  return (
    <header className="sticky top-0 z-30 shadow-sm">
      <div className="bg-primary">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-white">
            <Logo />
            <span className="leading-tight">
              <span className="block text-base font-bold sm:text-lg">{t('app.name')}</span>
              <span className="block text-[11px] text-white/75">{t('app.subtitle')}</span>
            </span>
          </Link>
          <SearchBox className="mx-2 hidden max-w-2xl md:flex" />
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <LanguagePicker />
            <AccountMenu />
            <CartLink />
          </div>
        </div>
        <div className="px-4 pb-2.5 md:hidden">
          <SearchBox />
        </div>
      </div>
      <nav className="bg-primary-dark" aria-label={t('nav.menu')}>
        <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5">
          <NavLink to="/categories" className={navClass}>
            {t('nav.allCategories')}
          </NavLink>
          {top.map((c) => (
            <NavLink key={c.id} to={`/c/${c.slug}`} className={navClass}>
              {pick(c.name)}
            </NavLink>
          ))}
          <span className="ms-auto" />
          <NavLink to="/my-orders" className={navClass}>
            {t('nav.myOrders')}
          </NavLink>
          {isStaff && (
            <NavLink to="/admin" className={navClass}>
              {t('nav.admin')}
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
