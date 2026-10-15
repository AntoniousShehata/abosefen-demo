// What a product IS, read from its name — and the kind of thing a search asks for (as production's SRCH-9 and PRD-1,
// 15 Oct 2026). A name is read by the words it BEGINS with, the longest phrase first: «حوض مطبخ …» is a kitchen sink,
// «مصفاة حوض مطبخ» a sink's strainer — though both hold «حوض» and «مطبخ». A search is read the same way, in Arabic,
// English or German, and among the products it finds, the things themselves come first.
// Pure (no imports from the app). Production reads ~150 kinds; the demo reads the kinds of its own invented catalogue.

import { fold } from './text.js';

// [kind, the words a name or a search begins it with] — written as they are typed; folded once below.
const KINDS = [
  ['kitchen-sink', ['حوض مطبخ', 'kitchen sink', 'sink', 'spule', 'kuchenspule', 'edelstahlspule', 'granitspule']],
  ['sink-strainer', ['مصفاة حوض', 'مصفاة', 'sink strainer', 'strainer', 'siebkorb']],
  ['dish-rack', ['مصفاة أطباق', 'dish rack', 'abtropfgestell']],
  ['soap-dispenser', ['موزع صابون', 'soap dispenser', 'spulmittelspender', 'seifenspender']],
  ['basin', ['حوض', 'basin', 'washbasin', 'waschbecken', 'waschtisch']],
  ['basin-mixer', ['خلاط حوض', 'basin mixer', 'waschtischarmatur']],
  ['kitchen-mixer', ['خلاط مطبخ', 'kitchen mixer', 'kuchenarmatur']],
  ['bath-mixer', ['خلاط بانيو', 'bath mixer', 'wannenarmatur']],
  ['shower-mixer', ['خلاط دش', 'shower mixer', 'brausearmatur']],
  ['bidet-mixer', ['خلاط شطاف', 'bidet mixer', 'bidetarmatur']],
  ['mixer', ['خلاط', 'mixer', 'faucet', 'armatur']],
  ['bidet-spray', ['شطاف', 'طقم شطاف', 'bidet spray', 'handbrause']],
  ['shower-column', ['عامود دش', 'shower column', 'duschsaule']],
  ['hand-shower', ['يد سماعة', 'مجموعة سماعة', 'hand shower', 'brauseset']],
  ['shower-hose', ['خرطوم دش', 'shower hose', 'brauseschlauch']],
  ['toilet', ['قاعدة', 'مرحاض', 'toilet', 'toilette', 'wc', 'stand wc', 'wand wc']],
  ['toilet-roll-holder', ['حامل مناديل', 'وراقة', 'toilet roll holder', 'papierrollenhalter', 'toilettenpapierhalter']],
  ['towel-bar', ['شماعة فوطة', 'towel bar', 'handtuchstange']],
  ['robe-hook', ['شماعة روب', 'robe hook', 'bademantelhaken']],
  ['soap-dish', ['صبانة', 'soap dish', 'seifenschale']],
  ['angle-valve', ['محبس زاوية', 'angle valve', 'eckventil']],
  ['concealed-valve', ['محبس دفن', 'concealed valve', 'unterputzventil']],
  ['ball-valve', ['محبس بلف', 'ball valve', 'kugelhahn']],
  ['valve', ['محبس', 'valve', 'ventil']],
  ['pipe', ['ماسورة', 'pipe', 'rohr']],
  ['elbow', ['كوع', 'elbow', 'winkel']],
  ['floor-drain', ['صفاية', 'floor drain', 'bodenablauf']],
  ['shower-channel', ['مجرى دش', 'shower drain', 'duschrinne']],
  ['bottle-trap', ['سيفون', 'bottle trap', 'siphon']],
].map(([kind, heads]) => [kind, heads.map((h) => fold(h).split(' '))]);

const wordsOf = (text) => fold(text).split(' ').filter(Boolean);
const stripArticle = (w) => (w.length > 4 && w.startsWith('ال') ? w.slice(2) : w);

/** The kind a name (or a search) reads as: the earliest head, the longest phrase at that place. null when none. */
export function readKind(text) {
  const words = wordsOf(text).map(stripArticle);
  let best = null;
  for (const [kind, heads] of KINDS) {
    for (const head of heads) {
      for (let at = 0; at + head.length <= words.length; at++) {
        if (!head.every((part, i) => words[at + i] === part)) continue;
        if (!best || at < best.at || (at === best.at && head.length > best.length)) best = { kind, at, length: head.length };
        break;
      }
    }
  }
  return best?.kind ?? null;
}
