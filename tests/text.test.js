import { describe, expect, it } from 'vitest';
import { fold, foldArabic, matchesQuery, queryWords, scoreMatch, wordForms } from '../src/lib/text.js';

describe('search normalisation', () => {
  it('folds the alef forms to one letter', () => {
    expect(foldArabic('أحواض')).toBe(foldArabic('احواض'));
    expect(foldArabic('إكسسوارات')).toBe(foldArabic('اكسسوارات'));
    expect(foldArabic('آلة')).toBe(foldArabic('الة'));
  });

  it('folds ta marbuta to ha and alef maqsura to ya', () => {
    expect(fold('قاعدة')).toBe(fold('قاعده'));
    expect(fold('رمادى')).toBe(fold('رمادي'));
    expect(fold('ذهبى مطفى')).toBe(fold('ذهبي مطفي'));
  });

  it('drops harakat and tatweel', () => {
    expect(fold('خَلّاط')).toBe(fold('خلاط'));
    expect(fold('خــلاط')).toBe(fold('خلاط'));
  });

  it('reads Arabic-Indic digits as digits and keeps 1/2 and 1.5 together', () => {
    expect(fold('٢٠ مم')).toBe('20 مم');
    expect(fold('½ inch 1/2')).toContain('1/2');
    expect(fold('1.5 m')).toBe('1.5 m');
  });

  it('lower-cases Latin and removes German accents', () => {
    expect(fold('Küchenarmatur')).toBe('kuchenarmatur');
    expect(fold('Weiß')).toBe('weiss');
  });

  it('strips the Arabic article and knows a few synonyms', () => {
    expect(wordForms(fold('الخلاط'))).toContain(fold('خلاط'));
    expect(wordForms('mixer')).toContain(fold('خلاط'));
    expect(wordForms(fold('حنفية'))).toContain('mixer');
  });

  it('ignores single letters but keeps single digits', () => {
    expect(queryWords('a خلاط 3')).toEqual(['خلاط', '3']);
  });

  it('matches every word in any field, in any order', () => {
    expect(matchesQuery('قاعده نوفا', 'قاعدة كيراسترا نوفا قطعة واحدة')).toBe(true);
    expect(matchesQuery('نوفا قاعده', 'قاعدة كيراسترا نوفا قطعة واحدة')).toBe(true);
    expect(matchesQuery('mixer nilora', 'Nilora Mira basin mixer')).toBe(true);
    expect(matchesQuery('خلاط', 'Nilora Mira basin mixer')).toBe(true);
    expect(matchesQuery('قاعده لينا', 'قاعدة كيراسترا نوفا')).toBe(false);
  });

  it('ranks an exact code first', () => {
    const byCode = scoreMatch('NIL-MIRA-B', { codes: ['NIL-MIRA-B'], names: ['Nilora Mira basin mixer'] });
    const byName = scoreMatch('mira', { codes: ['NIL-MIRA-B'], names: ['Nilora Mira basin mixer'] });
    expect(byCode).toBeGreaterThan(byName);
    expect(byName).toBeGreaterThan(0);
    expect(scoreMatch('toilet', { codes: ['X'], names: ['Nilora Mira basin mixer'] })).toBe(0);
  });
});

describe('the trade\'s own words (production SRCH-5)', () => {
  it('«نيبل» finds what is written «نبل», never nickel', () => {
    expect(matchesQuery('نيبل', 'نبل داخلى PPR بسن نحاس')).toBe(true);
    expect(matchesQuery('نيبل', 'حنفية نيكل لامع')).toBe(false);
  });

  it('«اطقم» finds a set, in Arabic or in English', () => {
    expect(matchesQuery('اطقم', 'طقم حمام كامل نوفا')).toBe(true);
    expect(matchesQuery('اطقم', 'Nilora hand shower set with rail')).toBe(true);
  });

  it('«بي بي ار», however its letters are written, is PPR', () => {
    expect(queryWords('كوع بى بى آر')).toEqual(['كوع', 'ppr']);
    expect(matchesQuery('بي بي ار', 'كوع 90° PPR')).toBe(true);
    expect(matchesQuery('كوع بي بي ار', 'تيه PPR متساوى')).toBe(false);
  });

  it('«كرسي» is the trade\'s word for a toilet', () => {
    expect(matchesQuery('كرسي', 'قاعدة كيراسترا نوفا')).toBe(true);
  });
});

describe('one search in every language (production SRCH-8)', () => {
  it('an English word stands alone: «bath» is never inside «bathroom»', () => {
    expect(matchesQuery('bath', 'Lina bathroom set')).toBe(false);
    expect(matchesQuery('bath', 'Nilora Mira bath mixer')).toBe(true);
    expect(matchesQuery('بانيو', 'Lina bathroom set', 'Lina Badset')).toBe(false);
  });

  it('a German part is found inside the word it builds', () => {
    expect(matchesQuery('Armatur', 'Nilora Duna Waschtischarmatur')).toBe(true);
    expect(matchesQuery('mixer', 'Nilora Duna Waschtischarmatur')).toBe(true);
    expect(matchesQuery('Dusche', 'Sefaro Vela Unterputz-Duscharmatur')).toBe(true);
  });

  it('a kitchen mixer\'s pull-out spray is no shower', () => {
    expect(matchesQuery('Dusche', 'Nilora Sora Küchenarmatur mit Zugbrause')).toBe(false);
    expect(matchesQuery('shower', 'Nilora Sora Küchenarmatur mit Zugbrause')).toBe(false);
  });

  it('a marked letter is typed with or without its mark', () => {
    expect(matchesQuery('Kuchenarmatur', 'Nilora Sora Küchenarmatur mit Zugbrause')).toBe(true);
    expect(matchesQuery('KÜCHENARMATUR', 'Nilora Sora Küchenarmatur mit Zugbrause')).toBe(true);
  });
});

describe('a short word is the beginning of a word (production SRCH-4)', () => {
  it('«بان» finds بانيو and بالبانيو, never a word with بان inside it', () => {
    expect(matchesQuery('بان', 'خلاط بانيو')).toBe(true);
    expect(matchesQuery('بان', 'تركيب بالبانيو')).toBe(true);
    expect(matchesQuery('بان', 'صبانة سيفارو')).toBe(false);
  });

  it('«حو» finds حوض, and a longer word is still found anywhere', () => {
    expect(matchesQuery('حو', 'خلاط حوض')).toBe(true);
    expect(matchesQuery('بانيو', 'صبانة بانيو')).toBe(true);
    expect(matchesQuery('لاط', 'خلاط')).toBe(false);
    expect(matchesQuery('خلاط', 'وصلة لخلاط')).toBe(true);
  });

  it('codes, sizes and numbers are still found inside a longer text', () => {
    expect(matchesQuery('12', 'ORD-2026-0012')).toBe(true);
    expect(matchesQuery('1/2', 'محبس 1/2 بوصة')).toBe(true);
  });
});
