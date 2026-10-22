/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, Providers } from '../src/App.jsx';
import { api } from '../src/api/index.js';
import { PRODUCTS } from '../src/data/catalog.js';
import { REELS, clock, productAt, publicCount } from '../src/data/reels.js';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Providers initialLanguage="en">
        <AppRoutes />
      </Providers>
    </MemoryRouter>,
  );

beforeEach(async () => {
  await api.reset();
});

afterEach(cleanup);

// As production's reels (VID-1): a product pops up on the video at its second, and customers see the views and likes
// from 100 views on.
describe('reels', () => {
  it('lists only products the catalogue has, each at a second inside its video', () => {
    for (const reel of REELS) {
      for (const p of reel.products) {
        expect(PRODUCTS.some((x) => x.modelCode === p.modelCode), `${reel.id}: ${p.modelCode}`).toBe(true);
        expect(p.at).toBeLessThan(reel.seconds);
      }
    }
  });

  it('shows the product of the moment for 4.5 seconds from its second', () => {
    const products = [{ modelCode: 'A', at: 2 }, { modelCode: 'B', at: 9 }];
    expect(productAt(products, 1.9)).toBeNull();
    expect(productAt(products, 2)?.modelCode).toBe('A');
    expect(productAt(products, 6.4)?.modelCode).toBe('A');
    expect(productAt(products, 6.6)).toBeNull();
    expect(productAt(products, 9.1)?.modelCode).toBe('B');
    expect(clock(83)).toBe('1:23');
  });

  it('tells customers the numbers only from 100 views on', () => {
    expect(publicCount(5, 99)).toBeNull();
    expect(publicCount(5, 100)).toBe(5);
  });

  it('home: the strip of reels opens the player at a reel', async () => {
    renderAt('/');
    const strip = await screen.findByTestId('reel-strip');
    expect(within(strip).getByText('Sora pull-out kitchen mixer')).toBeTruthy();
    expect(within(strip).queryByText('64 views')).toBeNull();
    expect(within(strip).getByText('1,240 views')).toBeTruthy();
  });

  it('the player lists the products of the video with the shop’s own card', async () => {
    renderAt('/reels/rain-column');
    const player = await screen.findByTestId('reels-player');
    const buttons = within(player).getAllByRole('button', { name: /Products in this video/ });
    expect(buttons).toHaveLength(REELS.length);
    fireEvent.click(buttons[1]);
    const sheet = await screen.findByTestId('reel-products');
    expect(within(sheet).getAllByTestId('product-card')).toHaveLength(3);
  });
});
