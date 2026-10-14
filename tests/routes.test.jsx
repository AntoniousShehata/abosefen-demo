/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, Providers } from '../src/App.jsx';
import { api } from '../src/api/index.js';
import { PRODUCTS } from '../src/data/catalog.js';

const renderAt = (path, lang = 'en') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Providers initialLanguage={lang}>
        <AppRoutes />
      </Providers>
    </MemoryRouter>,
  );

const mira = PRODUCTS.find((p) => p.modelCode === 'MIRA-B');
const angle = PRODUCTS.find((p) => p.modelCode === 'AV-1238');

beforeEach(async () => {
  await api.reset();
});

afterEach(cleanup);

describe('storefront routes', () => {
  it('home: banner, hero, promotion and departments', async () => {
    renderAt('/');
    expect(await screen.findByText('Everything for the bathroom and the kitchen — from the first pipe to the last towel bar')).toBeTruthy();
    expect(screen.getByTestId('demo-banner').textContent).toContain('Demo — synthetic data');
    expect(screen.getByText('Nilora mixer week')).toBeTruthy();
    expect(screen.getAllByTestId('product-card').length).toBeGreaterThan(5);
  });

  it('home in Arabic: right-to-left with the Arabic banner', async () => {
    renderAt('/', 'ar');
    expect(await screen.findByText('اخترناها لك')).toBeTruthy();
    expect(screen.getByTestId('demo-banner').textContent).toContain('نسخة عرض — بيانات وهمية');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('all categories', async () => {
    renderAt('/categories');
    expect(await screen.findByRole('heading', { level: 1, name: 'All categories' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Angle valves' }).length).toBeGreaterThan(0);
  });

  it('a category: breadcrumb links to every level, products listed', async () => {
    renderAt('/c/angle-valves');
    expect(await screen.findByRole('heading', { level: 1, name: 'Angle valves' })).toBeTruthy();
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    for (const name of ['Home', 'All categories', 'Rough-in', 'Valves', 'Angle valves']) {
      expect(crumbs.getByRole('link', { name })).toBeTruthy();
    }
    await waitFor(() => expect(screen.getAllByTestId('product-card').length).toBe(4));
  });

  it('a product with finishes: picking one changes the code', async () => {
    renderAt(`/p/${mira.slug}`);
    expect(await screen.findByTestId('product-title')).toBeTruthy();
    expect(await screen.findByText('NIL-MIRA-B-CHR')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Matte black/ }));
    expect(await screen.findByText('NIL-MIRA-B-BLK')).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-to-cart'));
    await waitFor(async () => expect((await api.getCart()).itemCount).toBe(1));
  });

  it('search tolerates Arabic letter variants', async () => {
    renderAt(`/search?q=${encodeURIComponent('قاعده')}`);
    const count = await screen.findByTestId('search-count');
    expect(Number(count.textContent.match(/\d+/)[0])).toBeGreaterThan(0);
  });

  it('cart: empty, then totals with VAT', async () => {
    const view = renderAt('/cart');
    expect(await screen.findByText('Your cart is empty.')).toBeTruthy();
    view.unmount();
    await api.addToCart({ productId: angle.id, quantity: 10 });
    renderAt('/cart');
    expect((await screen.findByTestId('totals-vat')).textContent).toContain('126');
    expect(screen.getByTestId('totals-total').textContent).toContain('1,026');
  });

  it('checkout is labelled a simulation and places an order', async () => {
    await api.addToCart({ productId: angle.id, quantity: 1 });
    renderAt('/checkout');
    expect((await screen.findByTestId('simulation-notice')).textContent).toContain('Simulation — no real payment');
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Demo Tester' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '0100 000 0000' } });
    fireEvent.click(screen.getByLabelText('Pick up from the showroom (free)'));
    fireEvent.click(screen.getByTestId('place-order'));
    expect(await screen.findByText('Thank you — your demo order is placed.')).toBeTruthy();
    expect(screen.getByTestId('order-timeline')).toBeTruthy();
  });

  it('an order page shows the timeline and can simulate the next step', async () => {
    await api.signIn('customer@demo');
    renderAt('/orders/o-1004');
    expect(await screen.findByTestId('order-timeline')).toBeTruthy();
    fireEvent.click(screen.getByTestId('simulate-next'));
    await waitFor(async () => expect((await api.getOrder('o-1004')).status).toBe('Preparing'));
  });

  it('demo sign-in lists the three accounts', async () => {
    renderAt('/signin');
    expect(await screen.findByTestId('account-owner')).toBeTruthy();
    expect(screen.getByTestId('account-cashier')).toBeTruthy();
    expect(screen.getByTestId('account-customer')).toBeTruthy();
  });

  it('an unknown page says so', async () => {
    renderAt('/no/such/page');
    expect(await screen.findByText('Page not found')).toBeTruthy();
  });
});

describe('back-office routes', () => {
  it('asks a visitor to sign in', async () => {
    renderAt('/admin');
    expect(await screen.findByText('Sign in with a demo account to open the back office.')).toBeTruthy();
  });

  it('owner: overview, products, categories, stock', async () => {
    await api.signIn('owner@demo');
    const home = renderAt('/admin');
    expect(await screen.findByTestId('activity-list')).toBeTruthy();
    home.unmount();

    const products = renderAt('/admin/products');
    await waitFor(() => expect(screen.getAllByTestId('row-check').length).toBeGreaterThan(60));
    fireEvent.click(screen.getAllByTestId('row-check')[0]);
    expect(screen.getByTestId('bulk-bar')).toBeTruthy();
    fireEvent.change(screen.getByTestId('bulk-target'), { target: { value: 'c-valves' } });
    fireEvent.click(screen.getByTestId('bulk-preview'));
    expect((await screen.findByTestId('move-preview')).textContent).toContain('final categories only');
    products.unmount();

    const categories = renderAt('/admin/categories');
    expect(await screen.findByTestId('category-tree')).toBeTruthy();
    categories.unmount();

    renderAt('/admin/stock');
    expect(await screen.findByTestId('movement-form')).toBeTruthy();
    expect(await screen.findByTestId('movements-table')).toBeTruthy();
  });

  it('cashier: orders open, products refused', async () => {
    await api.signIn('cashier@demo');
    const orders = renderAt('/admin/orders');
    expect(await screen.findByTestId('orders-table')).toBeTruthy();
    orders.unmount();
    renderAt('/admin/products');
    expect(await screen.findByText('This screen is not open to your role.')).toBeTruthy();
  });
});

describe('«How it\'s built»', () => {
  it('shows the numbers, the architecture and the eight case studies, each with its code', async () => {
    renderAt('/engineering');
    expect(await screen.findByText('The production system behind this demo')).toBeTruthy();
    expect(screen.getByText('5,098')).toBeTruthy();
    expect(screen.getByTestId('architecture-diagram')).toBeTruthy();
    const cases = screen.getAllByTestId('case-study');
    expect(cases).toHaveLength(8);
    for (const c of cases) expect(c.querySelector('pre code').textContent.length).toBeGreaterThan(200);
    expect(screen.getByText("Money can't be booked twice")).toBeTruthy();
  });

  it('in Arabic: right to left, while the code and the diagram read left to right', async () => {
    renderAt('/engineering', 'ar');
    expect(await screen.findByText('النظام الحقيقي اللي ورا نسخة العرض دي')).toBeTruthy();
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getAllByTestId('case-study')[0].querySelector('pre').getAttribute('dir')).toBe('ltr');
    expect(screen.getByTestId('architecture-diagram').closest('[dir]').getAttribute('dir')).toBe('ltr');
  });

  it('is linked from the demo banner on every page', async () => {
    renderAt('/');
    const link = await screen.findByTestId('how-built-link');
    expect(link.getAttribute('href')).toBe('/engineering');
  });
});

describe('«Latest in production»', () => {
  it('lists the newest changes; one the demo can show links to its own version', async () => {
    renderAt('/engineering');
    const list = await screen.findByTestId('latest-in-production');
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);
    const tryIt = within(list).getByText('Try it in the demo →');
    expect(decodeURIComponent(tryIt.getAttribute('href'))).toBe('/search?q=بان');
  });

  it('every item has its words in the three languages', async () => {
    const { LATEST } = await import('../src/data/engineering.js');
    const { translate } = await import('../src/i18n/I18nProvider.jsx');
    for (const lang of ['ar', 'en', 'de'])
      for (const c of LATEST) {
        expect(translate(lang, `engineering.latest.items.${c.id}.title`)).not.toContain('engineering.');
        expect(/^\d{4}-\d{2}-\d{2}$/.test(c.date)).toBe(true);
      }
  });
});

describe('the author and the tools', () => {
  it('says who owns the work and how AI is used, in every language', async () => {
    renderAt('/engineering');
    expect(await screen.findByText(/Designed, directed and shipped by Antonious Shehata/)).toBeTruthy();
    expect(within(screen.getByTestId('practice-ai')).getByText('How AI is used')).toBeTruthy();
  });
});
