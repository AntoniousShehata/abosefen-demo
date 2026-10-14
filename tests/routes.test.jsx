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
    expect(screen.getByText('NIL-MIRA-B-CHR')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Matte black/ }));
    expect(screen.getByText('NIL-MIRA-B-BLK')).toBeTruthy();
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
