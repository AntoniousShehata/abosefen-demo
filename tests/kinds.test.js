import { beforeEach, describe, expect, it } from 'vitest';
import { readKind } from '../src/lib/kinds.js';
import { createApi, memoryStorage } from '../src/api/createApi.js';

// As production's SRCH-9 (15 Oct 2026): on the live shop «Toilette» opened with a paper dispenser and «kitchen sink»
// with three kitchen mixers — the words were there, the thing was not. The demo reads its own names the same way.

describe('a name is read as the thing it begins with', () => {
  it.each([
    ['حوض مطبخ استانلس لومارو حوض واحد', 'kitchen-sink'],
    ['مصفاة حوض مطبخ', 'sink-strainer'],          // holds «حوض» and «مطبخ», and is no sink
    ['مصفاة أطباق استانلس لومارو', 'dish-rack'],
    ['حوض كيراسترا معلق', 'basin'],
    ['خلاط حوض نيلورا ميرا', 'basin-mixer'],
    ['خلاط شطاف دفن نيلورا', 'bidet-mixer'],
    ['قاعدة معلقة كيراسترا نوفا', 'toilet'],
    ['حامل مناديل لومارو', 'toilet-roll-holder'],
  ])('%s → %s', (name, kind) => {
    expect(readKind(name)).toBe(kind);
  });

  it.each([
    ['kitchen sink', 'kitchen-sink'],
    ['Küchenspüle', 'kitchen-sink'],
    ['Toilette', 'toilet'],
    ['basin mixer', 'basin-mixer'],
    ['Waschtischarmatur', 'basin-mixer'],
    ['خلاط حوض', 'basin-mixer'],
    ['Lumaro', null],
  ])('the search «%s» asks for %s', (query, kind) => {
    expect(readKind(query)).toBe(kind);
  });
});

describe('the things asked for come first', () => {
  let api;
  beforeEach(() => {
    api = createApi({ storage: memoryStorage(), latency: [0, 0] });
  });

  it('«kitchen sink»: the sinks, then the strainer that holds both words', async () => {
    const { items } = await api.search('kitchen sink');
    const kinds = items.map((p) => readKind(p.name.ar));
    expect(kinds[0]).toBe('kitchen-sink');
    const strainer = kinds.indexOf('sink-strainer');
    if (strainer >= 0) expect(kinds.slice(0, strainer).every((k) => k === 'kitchen-sink')).toBe(true);
  });

  it('«toilet» / «Toilette»: the toilets before the roll holder', async () => {
    for (const q of ['toilet', 'Toilette', 'قاعدة']) {
      const { items } = await api.search(q);
      const kinds = items.map((p) => readKind(p.name.ar));
      expect(kinds[0]).toBe('toilet');
      const holder = kinds.indexOf('toilet-roll-holder');
      if (holder >= 0) expect(kinds.slice(0, holder).every((k) => k === 'toilet')).toBe(true);
    }
  });

  it('the kind orders; it never adds or hides a product', async () => {
    const sinks = await api.search('kitchen sink');
    expect(sinks.total).toBe(sinks.items.length);
    expect((await api.search('Lumaro')).total).toBeGreaterThan(0);
  });
});
