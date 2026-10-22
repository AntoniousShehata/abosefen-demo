// The demo's reels — invented, like everything here. Production's reels are the shop's own short videos from its
// showroom (VID-1): each lists the products in it, and a product's card pops up on the video at the second it shows.
// The demo has no videos, so each «video» is a drawing that moves (components/ReelScene.jsx) and a clock that runs.

const L = (ar, en, de) => ({ ar, en, de });

/** As production: customers see the views and likes from this many views on. */
export const PUBLIC_COUNTS_FROM = 100;

export const REELS = [
  {
    id: 'mira-flow',
    scene: 'mixer',
    seconds: 18,
    views: 1240,
    likes: 86,
    title: L('خلاط حوض ميرا: شوف الضغط والحركة', 'Mira basin mixer: see the flow and the lever', 'Mira Waschtischarmatur: Durchfluss und Hebel'),
    text: L('متاح فى صالة العرض', 'In the showroom now', 'Jetzt im Ausstellungsraum'),
    products: [{ modelCode: 'MIRA-B', at: 2 }, { modelCode: 'BT', at: 9 }],
  },
  {
    id: 'rain-column',
    scene: 'shower',
    seconds: 22,
    views: 860,
    likes: 41,
    title: L('دش مطرى 30 سم: من ورا الحيطة لحد ما المية تنزل', 'Rain 30 cm column: from behind the wall to the water', 'Regensäule 30 cm: von der Wand bis zum Wasser'),
    text: L('عمود ومحبس دفن وصرف خطى', 'A column, a concealed mixer and a linear drain', 'Säule, Unterputzmischer und Duschrinne'),
    products: [{ modelCode: 'RAIN30', at: 2 }, { modelCode: 'VELA-CS', at: 8 }, { modelCode: 'LD', at: 14 }],
  },
  {
    id: 'sora-kitchen',
    scene: 'kitchen',
    seconds: 20,
    views: 64,
    likes: 5,
    title: L('خلاط مطبخ سورا بدش يتسحب', 'Sora pull-out kitchen mixer', 'Sora Küchenarmatur mit Auszugsbrause'),
    text: L('مع حوض جرانيت', 'With a granite sink', 'Mit Granitspüle'),
    products: [{ modelCode: 'SORA-K', at: 3 }, { modelCode: 'G1', at: 10 }],
  },
];

/** 0:24 — a length or a moment of a video. */
export function clock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The product on the video at this moment: the one whose second came less than 4.5 s ago. */
export function productAt(products, time) {
  let now = null;
  for (const p of products || []) {
    if (p.at == null) continue;
    if (time >= p.at && time < p.at + 4.5) now = p;
  }
  return now;
}

/** A number customers may read — from PUBLIC_COUNTS_FROM views on; null before. */
export const publicCount = (count, views) => (views >= PUBLIC_COUNTS_FROM ? count : null);
