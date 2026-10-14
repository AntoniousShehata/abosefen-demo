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
