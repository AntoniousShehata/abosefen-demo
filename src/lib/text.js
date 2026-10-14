// Search text folding — Arabic letter variants, digits and punctuation — and word matching.
// Pure (no imports from the app), so the fake API, the pages and the tests share one reading of a search.
//
//   أ إ آ ٱ → ا     ى → ي     ة → ه     ؤ → و     ئ → ي
//   harakat and tatweel are dropped, Arabic-Indic digits become 0-9, Latin is lower-cased,
//   everything that is not a letter or a digit becomes a space ("1/2" and "1.5" keep their sign).

const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;

/** Fold Arabic letter shapes and diacritics; lower-case Latin. */
export function foldArabic(text) {
  return String(text ?? '')
    .replace(HARAKAT, '')
    .replace(/ـ/g, '') // tatweel
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase();
}

/** Full fold for matching: letters + digits only, single spaces. */
export function fold(text) {
  return foldArabic(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Latin accents (ü → u) so German words match typed without them
    .replace(HARAKAT, '') // marks NFKD may have split off an Arabic letter
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9./ء-غف-ي]+/g, ' ')
    .replace(/[./](?![0-9])|(?<![0-9])[./]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// A few words a customer uses for the same thing, folded. Kept small on purpose: the production shop learns its
// vocabulary from searches; the demo only shows the idea.
const SYNONYM_GROUPS = [
  ['خلاط', 'خلاطات', 'حنفيه', 'mixer', 'mixers', 'tap', 'faucet', 'armatur', 'armaturen'],
  ['قاعده', 'قواعد', 'مرحاض', 'كرسي', 'toilet', 'wc'],
  ['حوض', 'احواض', 'basin', 'sink', 'waschbecken', 'spule'],
  ['دش', 'شاور', 'shower', 'dusche', 'brause'],
  ['ماسوره', 'مواسير', 'pipe', 'pipes', 'rohr'],
  ['محبس', 'محابس', 'valve', 'valves', 'ventil'],
  ['شطاف', 'شطافات', 'bidet'],
  ['استانلس', 'ستانلس', 'stainless', 'edelstahl'],
  ['كوع', 'اكواع', 'elbow', 'winkel'],
  // the trade's own spellings (production SRCH-5, the owner's words of 14 Oct 2026)
  ['نبل', 'نيبل', 'نبلات', 'نيبلات', 'nipple'],
  ['طقم', 'اطقم', 'set', 'sets'],
].map((group) => group.map(fold));

// A thing the trade names in more than one spoken word is read as the one word the catalogue writes («بي بي ار» = PPR).
const PHRASES = [['بي بي ار', 'ppr']].map(([spoken, word]) => [fold(spoken), word]);

const synonymsOf = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) synonymsOf.set(word, [...new Set([...(synonymsOf.get(word) || []), ...group])]);
}

const ARTICLES = ['بال', 'وال', 'فال', 'كال', 'لل', 'ال'];

/** The forms one query word may appear in: itself, without the Arabic article, and its synonyms. */
export function wordForms(word) {
  const forms = new Set([word]);
  for (const article of ARTICLES) {
    if (word.startsWith(article) && word.length - article.length >= 2) {
      forms.add(word.slice(article.length));
      break;
    }
  }
  for (const form of [...forms]) (synonymsOf.get(form) || []).forEach((s) => forms.add(s));
  return [...forms];
}

/** The words of a query, folded; single letters (not digits) are ignored. */
export function queryWords(query) {
  let text = ` ${fold(query)} `;
  for (const [spoken, word] of PHRASES) text = text.split(` ${spoken} `).join(` ${word} `);
  return text
    .trim()
    .split(' ')
    .filter((w) => w && !(w.length === 1 && !/[0-9]/.test(w)));
}

// A short word is the beginning of a word being typed (production's SRCH-4, 14 Oct 2026): «بان» finds بانيو and
// بالبانيو, never صبانة; «حو» finds حوض. It may follow the article or a joined و / ب. Longer words, and anything with a
// digit (codes, sizes, order numbers, phones), are still found anywhere.
const SHORT_WORD = 3;
const JOINED = ['بال', 'وال', 'فال', 'كال', 'لل', 'ال', 'و', 'ب'];

function foundIn(haystack, haystackWords, form) {
  if (form.length > SHORT_WORD || /[0-9]/.test(form)) return haystack.includes(form);
  return haystackWords.some((w) => w.startsWith(form) || JOINED.some((j) => w.startsWith(j) && w.slice(j.length).startsWith(form)));
}

/** True when every word of the query (or one of its forms) is found in the text of the fields. */
export function matchesQuery(query, ...fields) {
  const words = queryWords(query);
  if (words.length === 0) return false;
  const haystack = fields.flat().map(fold).join(' | ');
  const haystackWords = haystack.split(/[\s|]+/).filter(Boolean);
  return words.every((w) => wordForms(w).some((form) => foundIn(haystack, haystackWords, form)));
}

/**
 * A score for ordering results: an exact code beats a name, a name beats a category, a word at the start of a
 * name beats a word inside it. 0 = no match.
 */
export function scoreMatch(query, { codes = [], names = [], others = [] }) {
  const words = queryWords(query);
  if (words.length === 0) return 0;
  const wholeQuery = fold(query);
  if (codes.some((c) => fold(c) === wholeQuery)) return 1000;
  if (!matchesQuery(query, codes, names, others)) return 0;
  let score = 10;
  const nameText = names.map(fold).join(' | ');
  for (const w of words) {
    const forms = wordForms(w);
    if (forms.some((f) => nameText.includes(f))) score += 20;
    if (forms.some((f) => nameText.startsWith(f) || nameText.includes(` ${f}`))) score += 5;
  }
  return score;
}

/** A URL-friendly slug from a Latin name (falls back to a given id). */
export function slugify(text, fallback = 'item') {
  const slug = fold(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
}
