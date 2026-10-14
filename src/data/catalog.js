// SYNTHETIC catalogue. Every brand, model, price and number here is invented for the demo.
// Brand names are made up; any resemblance to a real maker is coincidental. No production product, photo,
// price or stock figure is used. The category NAMES follow the generic Egyptian sanitaryware market map
// (rough-in → finishing), which is public knowledge, not shop data.

import { slugify } from '../lib/text.js';

const L = (ar, en, de = en) => ({ ar, en, de });

export const WAREHOUSES = [
  { id: 'w-main', code: 'MAIN', name: L('المخزن الرئيسى', 'Main warehouse', 'Hauptlager') },
  { id: 'w-show', code: 'SHOW', name: L('صالة العرض', 'Showroom', 'Ausstellungsraum') },
];

export const BRANDS = [
  { code: 'NIL', name: 'Nilora', nameAr: 'نيلورا', countryOfOrigin: 'EGY' },
  { code: 'SEF', name: 'Sefaro', nameAr: 'سيفارو', countryOfOrigin: 'ITA' },
  { code: 'KER', name: 'Kerastra', nameAr: 'كيراسترا', countryOfOrigin: 'EGY' },
  { code: 'TUB', name: 'Tubora', nameAr: 'تيوبورا', countryOfOrigin: 'TUR' },
  { code: 'VAL', name: 'Valtora', nameAr: 'فالتورا', countryOfOrigin: 'CHN' },
  { code: 'LUM', name: 'Lumaro', nameAr: 'لومارو', countryOfOrigin: 'KOR' },
];

/** Colours and finishes, with the price factor a finish adds over chrome / white. */
export const FINISHES = {
  chrome: { code: 'CHR', hex: '#C7CCD4', factor: 1, name: L('كروم', 'Chrome', 'Chrom') },
  black: { code: 'BLK', hex: '#2F2F35', factor: 1.12, name: L('أسود مطفى', 'Matte black', 'Mattschwarz') },
  gold: { code: 'GLD', hex: '#C9A45C', factor: 1.25, name: L('ذهبى مطفى', 'Brushed gold', 'Gold gebürstet') },
  white: { code: 'WHT', hex: '#F7F7F5', factor: 1, name: L('أبيض', 'White', 'Weiß') },
  ivory: { code: 'IVR', hex: '#EFE6D2', factor: 1.06, name: L('عاجى', 'Ivory', 'Elfenbein') },
  steel: { code: 'STL', hex: '#BCC3CB', factor: 1, name: L('استانلس', 'Stainless steel', 'Edelstahl') },
  graniteBlack: { code: 'GBK', hex: '#3A3B40', factor: 1, name: L('جرانيت أسود', 'Granite black', 'Granit schwarz') },
  graniteBeige: { code: 'GBE', hex: '#CDB893', factor: 1.04, name: L('جرانيت بيج', 'Granite beige', 'Granit beige') },
  graniteGrey: { code: 'GGR', hex: '#8E9197', factor: 1, name: L('جرانيت رمادى', 'Granite grey', 'Granit grau') },
};

// ── Categories (products stand on final categories only) ─────────────────────────────────────────
const cat = (id, parentCategoryId, slug, ar, en, de, art, displayOrder) => ({
  id,
  code: id.slice(2).toUpperCase().replace(/-/g, '_'),
  parentCategoryId,
  slug,
  name: en,
  nameAr: ar,
  nameDe: de,
  art,
  displayOrder,
  isActive: true,
});

export const CATEGORIES = [
  cat('c-roughin', null, 'rough-in', 'التأسيس', 'Rough-in', 'Rohinstallation', { kind: 'pipe' }, 1),
  cat('c-ppr-pipes', 'c-roughin', 'ppr-pipes', 'مواسير PPR', 'PPR pipes', 'PPR-Rohre', { kind: 'pipe' }, 1),
  cat('c-ppr-fittings', 'c-roughin', 'ppr-fittings', 'وصلات PPR', 'PPR fittings', 'PPR-Fittings', { kind: 'fitting', shape: 'tee' }, 2),
  cat('c-valves', 'c-roughin', 'valves', 'محابس', 'Valves', 'Ventile', { kind: 'valve-angle' }, 3),
  cat('c-angle-valves', 'c-valves', 'angle-valves', 'محبس زاوية', 'Angle valves', 'Eckventile', { kind: 'valve-angle' }, 1),
  cat('c-concealed-valves', 'c-valves', 'concealed-valves', 'محبس دفن', 'Concealed valves', 'Unterputzventile', { kind: 'valve-concealed' }, 2),
  cat('c-ball-valves', 'c-valves', 'ball-valves', 'محبس بلف', 'Ball valves', 'Kugelhähne', { kind: 'valve-ball' }, 3),
  cat('c-flex-hoses', 'c-roughin', 'flexible-connectors', 'وصلات مرنة', 'Flexible connectors', 'Flexschläuche', { kind: 'flex-hose' }, 4),
  cat('c-drainage', 'c-roughin', 'drainage', 'صرف', 'Drainage', 'Entwässerung', { kind: 'drain' }, 5),

  cat('c-mixers', null, 'mixers', 'خلاطات مياه', 'Water mixers', 'Armaturen', { kind: 'mixer-basin' }, 2),
  cat('c-basin-mixers', 'c-mixers', 'basin-mixers', 'خلاط حوض', 'Basin mixers', 'Waschtischarmaturen', { kind: 'mixer-basin' }, 1),
  cat('c-kitchen-mixers', 'c-mixers', 'kitchen-mixers', 'خلاط مطبخ', 'Kitchen mixers', 'Küchenarmaturen', { kind: 'mixer-kitchen' }, 2),
  cat('c-bath-mixers', 'c-mixers', 'bath-shower-mixers', 'خلاط بانيو ودش', 'Bath & shower mixers', 'Wannen- & Brausearmaturen', { kind: 'mixer-bath' }, 3),
  cat('c-bidet-sprays', 'c-mixers', 'bidet-sprays', 'شطافات', 'Bidet sprays', 'Bidet-Handbrausen', { kind: 'bidet-spray' }, 4),

  cat('c-showers', null, 'shower-systems', 'أنظمة الدش', 'Shower systems', 'Duschsysteme', { kind: 'shower-column' }, 3),
  cat('c-shower-columns', 'c-showers', 'shower-columns', 'عامود دش', 'Shower columns', 'Duschsäulen', { kind: 'shower-column' }, 1),
  cat('c-hand-showers', 'c-showers', 'hand-showers', 'مجموعة سماعة', 'Hand shower sets', 'Handbrause-Sets', { kind: 'hand-shower' }, 2),

  cat('c-sanitary', null, 'sanitary-ware', 'أدوات صحية', 'Sanitary ware', 'Sanitärkeramik', { kind: 'toilet' }, 4),
  cat('c-toilets', 'c-sanitary', 'toilets', 'قواعد / مراحيض', 'Toilets / WCs', 'WCs', { kind: 'toilet' }, 1),
  cat('c-basins', 'c-sanitary', 'basins', 'أحواض', 'Basins', 'Waschbecken', { kind: 'basin', shape: 'pedestal' }, 2),
  cat('c-bathroom-sets', 'c-sanitary', 'bathroom-sets', 'أطقم حمامات', 'Bathroom sets', 'Badsets', { kind: 'set', shape: 'bath' }, 3),

  cat('c-kitchen-sinks', null, 'kitchen-sinks', 'أحواض مطبخ', 'Kitchen sinks', 'Küchenspülen', { kind: 'sink' }, 5),
  cat('c-steel-sinks', 'c-kitchen-sinks', 'stainless-sinks', 'أحواض استانلس', 'Stainless steel sinks', 'Edelstahlspülen', { kind: 'sink' }, 1),
  cat('c-granite-sinks', 'c-kitchen-sinks', 'granite-sinks', 'أحواض جرانيت', 'Granite sinks', 'Granitspülen', { kind: 'sink', color: '#3A3B40', speckle: true }, 2),
  cat('c-kitchen-sets', 'c-kitchen-sinks', 'kitchen-sets', 'أطقم مطبخ', 'Kitchen sets', 'Küchensets', { kind: 'set', shape: 'kitchen' }, 3),

  cat('c-accessories', null, 'accessories', 'إكسسوارات', 'Accessories', 'Accessoires', { kind: 'towel-bar' }, 6),
  cat('c-bath-accessories', 'c-accessories', 'bathroom-accessories', 'إكسسوارات حمام', 'Bathroom accessories', 'Badaccessoires', { kind: 'towel-bar' }, 1),
  cat('c-kitchen-accessories', 'c-accessories', 'kitchen-accessories', 'إكسسوارات مطبخ', 'Kitchen accessories', 'Küchenaccessoires', { kind: 'dish-rack' }, 2),
];

// ── Specification labels and common values ───────────────────────────────────────────────────────
export const SPEC_LABELS = {
  material: L('الخامة', 'Material', 'Material'),
  connection: L('مقاس التوصيل', 'Connection', 'Anschluss'),
  pressure: L('الضغط', 'Pressure rating', 'Druckstufe'),
  length: L('الطول', 'Length', 'Länge'),
  cartridge: L('الكارتيدج', 'Cartridge', 'Kartusche'),
  warranty: L('الضمان', 'Warranty', 'Garantie'),
  dimensions: L('المقاسات', 'Dimensions', 'Maße'),
  flush: L('نظام الطرد', 'Flush', 'Spülung'),
  mounting: L('التركيب', 'Mounting', 'Montage'),
  bowls: L('عدد الأحواض', 'Bowls', 'Becken'),
  functions: L('الوظائف', 'Functions', 'Funktionen'),
};

const V = {
  brass: L('نحاس', 'Brass', 'Messing'),
  ppr: L('بولى بروبلين PPR', 'Polypropylene (PPR)', 'Polypropylen (PPR)'),
  steel304: L('استانلس 304', 'Stainless steel 304', 'Edelstahl 304'),
  ceramic: L('بورسلين', 'Vitreous china', 'Sanitärporzellan'),
  granite: L('جرانيت مركب', 'Granite composite', 'Granitverbund'),
  disc35: L('سيراميك 35 مم', 'Ceramic disc 35 mm', 'Keramikscheibe 35 mm'),
  disc40: L('سيراميك 40 مم', 'Ceramic disc 40 mm', 'Keramikscheibe 40 mm'),
  years: (n) => L(`${n} سنوات`, `${n} years`, `${n} Jahre`),
  deck: L('على الحوض', 'Deck mounted', 'Standmontage'),
  wall: L('حائط', 'Wall mounted', 'Wandmontage'),
  concealed: L('دفن', 'Concealed', 'Unterputz'),
  floor: L('أرضى', 'Floor standing', 'Bodenstehend'),
  dual: L('زرارين 3 / 6 لتر', 'Dual flush 3 / 6 l', 'Zweimengen 3 / 6 l'),
  half: L('½ بوصة', '½ inch', '½ Zoll'),
};

// ── Short descriptions by kind (the product adds its own specifications) ───────────────────────
const KIND_TEXT = {
  pipe: L(
    'ماسورة PPR لتغذية المياه، تُلحم بالحرارة فتصبح الوصلة قطعة واحدة مع الماسورة بدون تسريب.',
    'PPR supply pipe, heat-welded so every joint becomes one piece with the pipe — no leaks.',
    'PPR-Versorgungsrohr, heißverschweißt: jede Verbindung wird eins mit dem Rohr — dicht.',
  ),
  fitting: L(
    'وصلة PPR تُلحم بالحرارة، متوافقة مع كل مواسير PPR بنفس المقاس.',
    'Heat-welded PPR fitting, compatible with every PPR pipe of the same size.',
    'Heißverschweißbares PPR-Fitting, passend zu allen PPR-Rohren gleicher Größe.',
  ),
  'valve-angle': L(
    'محبس زاوية يركب تحت الحوض أو جنب القاعدة لقفل المياه عن جهاز واحد بدون قفل البيت كله.',
    'Angle valve fitted under a basin or beside a toilet: shut one fixture off without closing the whole house.',
    'Eckventil unter dem Waschbecken oder neben dem WC: ein Gerät absperren, ohne das ganze Haus.',
  ),
  'valve-concealed': L(
    'محبس دفن يركب داخل الحائط، ويظهر منه الوش والذراع فقط.',
    'Concealed valve built into the wall; only the cover plate and handle show.',
    'Unterputzventil in der Wand; sichtbar sind nur Rosette und Griff.',
  ),
  'valve-ball': L(
    'محبس بلف (كورة) بقفل ربع لفة، للخط الرئيسى أو خطوط التغذية.',
    'Quarter-turn ball valve for the main line or branch supply lines.',
    'Kugelhahn mit Vierteldrehung für Haupt- und Abzweigleitungen.',
  ),
  'flex-hose': L(
    'وصلة مرنة مغطاة بسلك استانلس مضفّر. الاسم حسب الطرفين: «وصلة شجرة» = صامولة × سن خلاط، «وصلة» = صامولة من الناحيتين.',
    'Braided stainless flexible connector. Named by its two ends: a mixer connector is nut × mixer thread; a plain connector has a nut at both ends.',
    'Flexschlauch mit Edelstahlgeflecht. Benannt nach den Enden: Armaturenanschluss = Mutter × Armaturengewinde; einfacher Schlauch = Mutter an beiden Enden.',
  ),
  drain: L(
    'صرف أرضى استانلس بجالون يمنع الروائح.',
    'Stainless floor drain with an odour trap.',
    'Edelstahl-Bodenablauf mit Geruchsverschluss.',
  ),
  trap: L('سيفون زجاجة للحوض، سهل الفك والتنظيف.', 'Bottle trap for a basin, easy to open and clean.', 'Flaschensiphon für Waschbecken, leicht zu öffnen und zu reinigen.'),
  'mixer-basin': L(
    'خلاط حوض بذراع واحد وكارتيدج سيراميك، مع وصلات مرنة.',
    'Single-lever basin mixer with a ceramic cartridge; flexible connectors included.',
    'Einhebel-Waschtischarmatur mit Keramikkartusche; Flexschläuche inklusive.',
  ),
  'mixer-kitchen': L(
    'خلاط مطبخ بذراع واحد ورقبة تتحرك يمين وشمال.',
    'Single-lever kitchen mixer with a swivel spout.',
    'Einhebel-Küchenarmatur mit schwenkbarem Auslauf.',
  ),
  'mixer-bath': L(
    'خلاط بانيو ودش بمحوّل بين الحنفية والدش.',
    'Bath and shower mixer with a diverter between spout and shower.',
    'Wannen- und Brausearmatur mit Umsteller zwischen Auslauf und Brause.',
  ),
  'mixer-concealed': L(
    'خلاط دفن: الجسم داخل الحائط والوش فقط ظاهر.',
    'Concealed mixer: the body sits in the wall, only the trim shows.',
    'Unterputzarmatur: der Körper liegt in der Wand, sichtbar ist nur die Blende.',
  ),
  'bidet-spray': L('شطاف يدوى بخرطوم وحامل.', 'Hand-held bidet spray with hose and holder.', 'Bidet-Handbrause mit Schlauch und Halter.'),
  'shower-column': L(
    'عامود دش بطاسة علوية ويد سماعة، تركيب حائط.',
    'Shower column with an overhead rain shower and a hand shower, wall mounted.',
    'Duschsäule mit Kopfbrause und Handbrause, Wandmontage.',
  ),
  'hand-shower': L('يد سماعة وخرطوم لتركيب سهل.', 'Hand shower and hose for easy fitting.', 'Handbrause und Schlauch, einfach zu montieren.'),
  toilet: L(
    'قاعدة بورسلين بطرد قوى وغطاء بطىء النزول.',
    'Vitreous china toilet with a strong flush and a soft-close seat.',
    'WC aus Sanitärporzellan mit kräftiger Spülung und Absenkautomatik.',
  ),
  basin: L('حوض بورسلين سهل التنظيف.', 'Easy-clean vitreous china basin.', 'Pflegeleichtes Waschbecken aus Sanitärporzellan.'),
  sink: L(
    'حوض مطبخ بسيفون ومصفاة، يركب فوق الرخامة.',
    'Kitchen sink with waste and strainer, top-mounted.',
    'Küchenspüle mit Ablaufgarnitur und Sieb, Einbau von oben.',
  ),
  set: L(
    'طقم كامل بسعر أقل من مجموع القطع. المخزون يُحسب من القطع نفسها.',
    'A complete set for less than its parts. Stock is counted from the parts themselves.',
    'Ein komplettes Set, günstiger als die Einzelteile. Der Bestand ergibt sich aus den Teilen.',
  ),
  accessory: L('إكسسوار حمام مطابق لتشطيب الخلاطات.', 'Bathroom accessory matching the mixer finishes.', 'Badaccessoire passend zu den Armaturen-Oberflächen.'),
  kitchenAccessory: L('إكسسوار مطبخ من الاستانلس.', 'Stainless kitchen accessory.', 'Küchenaccessoire aus Edelstahl.'),
};

// ── Size lists ──────────────────────────────────────────────────────────────────────────────────
const S = (code, label, price) => ({ code, label, price });
const mm = (n) => L(`${n} مم`, `${n} mm`, `${n} mm`);
const cm = (n) => L(`${n} سم`, `${n} cm`, `${n} cm`);
const ppr = (p20, p25, p32) => [S('20', mm(20), p20), S('25', mm(25), p25), S('32', mm(32), p32)];
const inch = {
  half: L('½ بوصة', '½ inch', '½ Zoll'),
  threeQ: L('¾ بوصة', '¾ inch', '¾ Zoll'),
  one: L('1 بوصة', '1 inch', '1 Zoll'),
};

// ── Products ────────────────────────────────────────────────────────────────────────────────────
// p(): one compact line per product; variants are built from finishes × sizes.
const RAW = [];
const p = (def) => RAW.push(def);

const MIX3 = ['chrome', 'black', 'gold'];
const MIX2 = ['chrome', 'black'];

// Rough-in — PPR pipes
p({ cat: 'c-ppr-pipes', brand: 'TUB', model: 'PN10', kind: 'pipe', art: { color: '#5E9E6E', stripe: '#2F6FD6' },
  name: L('ماسورة PPR مياه باردة PN10 — 4 متر', 'PPR pipe PN10, cold water — 4 m', 'PPR-Rohr PN10, Kaltwasser — 4 m'),
  sizes: ppr(38, 55, 88), specs: [['material', V.ppr], ['pressure', 'PN10'], ['length', L('4 متر', '4 m', '4 m')], ['warranty', V.years(10)]] });
p({ cat: 'c-ppr-pipes', brand: 'TUB', model: 'PN20', kind: 'pipe', art: { color: '#5E9E6E', stripe: '#D64B3A' }, featured: true,
  name: L('ماسورة PPR مياه ساخنة PN20 — 4 متر', 'PPR pipe PN20, hot water — 4 m', 'PPR-Rohr PN20, Warmwasser — 4 m'),
  sizes: ppr(62, 92, 145), specs: [['material', V.ppr], ['pressure', 'PN20'], ['length', L('4 متر', '4 m', '4 m')], ['warranty', V.years(10)]] });
p({ cat: 'c-ppr-pipes', brand: 'TUB', model: 'PN25-FB', kind: 'pipe', art: { color: '#E9ECEF', stripe: '#D64B3A' },
  name: L('ماسورة PPR فايبر PN25 — 4 متر', 'PPR fibre composite pipe PN25 — 4 m', 'PPR-Faserverbundrohr PN25 — 4 m'),
  sizes: ppr(85, 125, 195), specs: [['material', V.ppr], ['pressure', 'PN25'], ['length', L('4 متر', '4 m', '4 m')], ['warranty', V.years(10)]] });

// Rough-in — PPR fittings
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'EL90', kind: 'fitting', art: { shape: 'elbow', color: '#5E9E6E' },
  name: L('كوع 90° PPR', 'PPR elbow 90°', 'PPR-Winkel 90°'), sizes: ppr(4, 6, 10), specs: [['material', V.ppr]] });
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'EL45', kind: 'fitting', art: { shape: 'elbow45', color: '#5E9E6E' },
  name: L('كوع 45° PPR', 'PPR elbow 45°', 'PPR-Winkel 45°'), sizes: ppr(4, 6, 11), specs: [['material', V.ppr]] });
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'TEE', kind: 'fitting', art: { shape: 'tee', color: '#5E9E6E' },
  name: L('تيه PPR متساوى', 'PPR equal tee', 'PPR-T-Stück gleich'), sizes: ppr(5, 8, 13), specs: [['material', V.ppr]] });
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'CPL', kind: 'fitting', art: { shape: 'coupling', color: '#5E9E6E' },
  name: L('جلبة PPR', 'PPR coupling', 'PPR-Muffe'), sizes: ppr(3, 4, 7), specs: [['material', V.ppr]] });
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'FA', kind: 'fitting', art: { shape: 'adapter', color: '#5E9E6E' },
  name: L('نبل داخلى PPR بسن نحاس', 'PPR female adapter, brass thread', 'PPR-Übergang Innengewinde, Messing'),
  sizes: [S('20x12', L('20 مم × ½ بوصة', '20 mm × ½"', '20 mm × ½"'), 32), S('25x34', L('25 مم × ¾ بوصة', '25 mm × ¾"', '25 mm × ¾"'), 48)],
  specs: [['material', L('PPR + نحاس', 'PPR + brass', 'PPR + Messing')]] });
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'MA', kind: 'fitting', art: { shape: 'adapter', color: '#5E9E6E' },
  name: L('نبل خارجى PPR بسن نحاس', 'PPR male adapter, brass thread', 'PPR-Übergang Außengewinde, Messing'),
  sizes: [S('20x12', L('20 مم × ½ بوصة', '20 mm × ½"', '20 mm × ½"'), 34), S('25x34', L('25 مم × ¾ بوصة', '25 mm × ¾"', '25 mm × ¾"'), 52)],
  specs: [['material', L('PPR + نحاس', 'PPR + brass', 'PPR + Messing')]] });
p({ cat: 'c-ppr-fittings', brand: 'TUB', model: 'CAP', kind: 'fitting', art: { shape: 'cap', color: '#5E9E6E' },
  name: L('طبة PPR', 'PPR end cap', 'PPR-Endkappe'), sizes: ppr(3, 4, 6), specs: [['material', V.ppr]] });

// Rough-in — valves
p({ cat: 'c-angle-valves', brand: 'VAL', model: 'AV-1212', kind: 'valve-angle', finishes: MIX2, price: 95,
  name: L('محبس زاوية ½ × ½ بوصة', 'Angle valve ½ × ½ inch', 'Eckventil ½ × ½ Zoll'), specs: [['material', V.brass], ['connection', '½" × ½"'], ['warranty', V.years(2)]] });
p({ cat: 'c-angle-valves', brand: 'VAL', model: 'AV-1238', kind: 'valve-angle', price: 90,
  name: L('محبس زاوية ½ × ⅜ بوصة', 'Angle valve ½ × ⅜ inch', 'Eckventil ½ × ⅜ Zoll'), specs: [['material', V.brass], ['connection', '½" × ⅜"'], ['warranty', V.years(2)]] });
p({ cat: 'c-angle-valves', brand: 'SEF', model: 'AVF', kind: 'valve-angle', finishes: MIX3, price: 185,
  name: L('محبس زاوية بفلتر سيفارو', 'Sefaro angle valve with filter', 'Sefaro Eckventil mit Filter'), specs: [['material', V.brass], ['connection', '½" × ½"'], ['warranty', V.years(5)]] });
p({ cat: 'c-angle-valves', brand: 'SEF', model: 'AVC', kind: 'valve-angle', price: 160,
  name: L('محبس زاوية سيراميك تقيل سيفارو', 'Sefaro heavy ceramic-disc angle valve', 'Sefaro Keramik-Eckventil, schwer'), specs: [['material', V.brass], ['cartridge', V.disc35], ['warranty', V.years(5)]] });
p({ cat: 'c-concealed-valves', brand: 'VAL', model: 'CV', kind: 'valve-concealed',
  name: L('محبس دفن فالتورا', 'Valtora concealed stop valve', 'Valtora Unterputz-Absperrventil'),
  sizes: [S('12', inch.half, 240), S('34', inch.threeQ, 310)], specs: [['material', V.brass], ['mounting', V.concealed]] });
p({ cat: 'c-concealed-valves', brand: 'SEF', model: 'CVS', kind: 'valve-concealed', finishes: MIX2,
  name: L('محبس دفن سيراميك سيفارو', 'Sefaro ceramic concealed valve', 'Sefaro Keramik-Unterputzventil'),
  sizes: [S('12', inch.half, 420), S('34', inch.threeQ, 520)], specs: [['material', V.brass], ['cartridge', V.disc35], ['mounting', V.concealed]] });
p({ cat: 'c-ball-valves', brand: 'VAL', model: 'BV-L', kind: 'valve-ball', art: { handle: 'lever' },
  name: L('محبس بلف نحاس بذراع', 'Brass ball valve, lever handle', 'Messing-Kugelhahn mit Hebel'),
  sizes: [S('12', inch.half, 120), S('34', inch.threeQ, 165), S('1', inch.one, 260)], specs: [['material', V.brass], ['pressure', 'PN25']] });
p({ cat: 'c-ball-valves', brand: 'VAL', model: 'BV-B', kind: 'valve-ball', art: { handle: 'butterfly' },
  name: L('محبس بلف بذراع فراشة', 'Ball valve, butterfly handle', 'Kugelhahn mit Flügelgriff'),
  sizes: [S('12', inch.half, 105), S('34', inch.threeQ, 145)], specs: [['material', V.brass], ['pressure', 'PN16']] });
p({ cat: 'c-ball-valves', brand: 'TUB', model: 'BV-PPR', kind: 'valve-ball', art: { handle: 'lever', color: '#5E9E6E' },
  name: L('محبس بلف PPR', 'PPR ball valve', 'PPR-Kugelhahn'), sizes: ppr(95, 130, 190), specs: [['material', V.ppr], ['pressure', 'PN20']] });

// Rough-in — flexible connectors (named by their two ends)
p({ cat: 'c-flex-hoses', brand: 'VAL', model: 'FX-M', kind: 'flex-hose', art: { ends: 'mixer' },
  name: L('وصلة شجرة لخلاط — صامولة × سن خلاط', 'Flexible mixer connector — nut × mixer thread', 'Armaturenanschluss flexibel — Mutter × Armaturengewinde'),
  sizes: [S('30', cm(30), 45), S('40', cm(40), 50), S('50', cm(50), 58)], specs: [['material', V.steel304], ['connection', 'M10 × ⅜"']] });
p({ cat: 'c-flex-hoses', brand: 'VAL', model: 'FX-N', kind: 'flex-hose', art: { ends: 'nut' },
  name: L('وصلة مرنة سخان — صامولة × صامولة', 'Flexible connector — nut × nut (heater)', 'Flexschlauch — Mutter × Mutter (Boiler)'),
  sizes: [S('1212', L('½ × ½ بوصة', '½ × ½ inch', '½ × ½ Zoll'), 55), S('1234', L('½ × ¾ بوصة', '½ × ¾ inch', '½ × ¾ Zoll'), 62), S('38', L('⅜ بوصة', '⅜ inch', '⅜ Zoll'), 50)],
  specs: [['material', V.steel304], ['length', L('40 سم', '40 cm', '40 cm')]] });

// Rough-in — drainage
p({ cat: 'c-drainage', brand: 'VAL', model: 'FD', kind: 'drain',
  name: L('صفاية أرضية استانلس', 'Stainless floor drain', 'Edelstahl-Bodenablauf'),
  sizes: [S('10', L('10 × 10 سم', '10 × 10 cm', '10 × 10 cm'), 85), S('15', L('15 × 15 سم', '15 × 15 cm', '15 × 15 cm'), 140)], specs: [['material', V.steel304]] });
p({ cat: 'c-drainage', brand: 'SEF', model: 'LD', kind: 'drain', art: { shape: 'linear' },
  name: L('مجرى دش طولى سيفارو', 'Sefaro linear shower drain', 'Sefaro Duschrinne'),
  sizes: [S('60', cm(60), 650), S('80', cm(80), 820)], specs: [['material', V.steel304]] });
p({ cat: 'c-drainage', brand: 'VAL', model: 'BT', kind: 'trap', finishes: MIX2, price: 180,
  name: L('سيفون حوض زجاجة', 'Basin bottle trap', 'Flaschensiphon für Waschbecken'), specs: [['material', V.brass], ['connection', '1¼"']] });

// Mixers — basin
p({ cat: 'c-basin-mixers', brand: 'NIL', model: 'MIRA-B', kind: 'mixer-basin', finishes: MIX3, price: 1450, featured: true,
  name: L('خلاط حوض نيلورا ميرا', 'Nilora Mira basin mixer', 'Nilora Mira Waschtischarmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc35], ['mounting', V.deck], ['warranty', V.years(5)]] });
p({ cat: 'c-basin-mixers', brand: 'NIL', model: 'MIRA-BT', kind: 'mixer-basin', art: { shape: 'tall' }, finishes: MIX3, price: 1980,
  name: L('خلاط حوض عالى نيلورا ميرا', 'Nilora Mira tall basin mixer', 'Nilora Mira Waschtischarmatur, hoch'),
  specs: [['material', V.brass], ['cartridge', V.disc35], ['mounting', V.deck], ['warranty', V.years(5)]] });
p({ cat: 'c-basin-mixers', brand: 'NIL', model: 'DUNA-B', kind: 'mixer-basin', art: { shape: 'round' }, finishes: MIX2, price: 1150,
  name: L('خلاط حوض نيلورا دونا', 'Nilora Duna basin mixer', 'Nilora Duna Waschtischarmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc35], ['mounting', V.deck], ['warranty', V.years(3)]] });
p({ cat: 'c-basin-mixers', brand: 'SEF', model: 'VELA-B', kind: 'mixer-basin', art: { shape: 'square' }, finishes: MIX3, price: 2650, compareAt: 2950, featured: true,
  name: L('خلاط حوض سيفارو فيلا', 'Sefaro Vela basin mixer', 'Sefaro Vela Waschtischarmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc40], ['mounting', V.deck], ['warranty', V.years(7)]] });
p({ cat: 'c-basin-mixers', brand: 'SEF', model: 'ARCO-B', kind: 'mixer-basin', art: { shape: 'round' }, finishes: ['chrome', 'gold'], price: 2350,
  name: L('خلاط حوض سيفارو أركو', 'Sefaro Arco basin mixer', 'Sefaro Arco Waschtischarmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc40], ['mounting', V.deck], ['warranty', V.years(7)]] });

// Mixers — kitchen
p({ cat: 'c-kitchen-mixers', brand: 'NIL', model: 'SORA-K', kind: 'mixer-kitchen', art: { shape: 'pullout' }, finishes: MIX2, price: 2450, featured: true,
  name: L('خلاط مطبخ نيلورا سورا بدش سحب', 'Nilora Sora pull-out kitchen mixer', 'Nilora Sora Küchenarmatur mit Zugbrause'),
  specs: [['material', V.brass], ['cartridge', V.disc40], ['functions', L('مياه عادية + دش', 'Stream + spray', 'Strahl + Brause')], ['warranty', V.years(5)]] });
p({ cat: 'c-kitchen-mixers', brand: 'NIL', model: 'DUNA-K', kind: 'mixer-kitchen', price: 1650, finishes: ['chrome'],
  name: L('خلاط مطبخ نيلورا دونا رقبة متحركة', 'Nilora Duna swivel kitchen mixer', 'Nilora Duna Küchenarmatur schwenkbar'),
  specs: [['material', V.brass], ['cartridge', V.disc35], ['warranty', V.years(3)]] });
p({ cat: 'c-kitchen-mixers', brand: 'SEF', model: 'CURVA-K', kind: 'mixer-kitchen', art: { shape: 'goose' }, finishes: MIX3, price: 3350,
  name: L('خلاط مطبخ سيفارو كورفا رقبة أوزة', 'Sefaro Curva gooseneck kitchen mixer', 'Sefaro Curva Küchenarmatur Schwanenhals'),
  specs: [['material', V.brass], ['cartridge', V.disc40], ['warranty', V.years(7)]] });
p({ cat: 'c-kitchen-mixers', brand: 'SEF', model: 'WALL-K', kind: 'mixer-bath', art: { shape: 'wallKitchen' }, price: 1850, finishes: ['chrome'],
  name: L('خلاط مطبخ حائط سيفارو', 'Sefaro wall-mounted kitchen mixer', 'Sefaro Küchenarmatur Wandmontage'),
  specs: [['material', V.brass], ['mounting', V.wall], ['warranty', V.years(5)]] });

// Mixers — bath & shower
p({ cat: 'c-bath-mixers', brand: 'NIL', model: 'MIRA-BS', kind: 'mixer-bath', finishes: MIX3, price: 2150,
  name: L('خلاط بانيو نيلورا ميرا', 'Nilora Mira bath mixer', 'Nilora Mira Wannenarmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc35], ['mounting', V.wall], ['warranty', V.years(5)]] });
p({ cat: 'c-bath-mixers', brand: 'NIL', model: 'DUNA-S', kind: 'mixer-bath', art: { shape: 'shower' }, finishes: MIX2, price: 1350,
  name: L('خلاط دش نيلورا دونا', 'Nilora Duna shower mixer', 'Nilora Duna Brausearmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc35], ['mounting', V.wall], ['warranty', V.years(3)]] });
p({ cat: 'c-bath-mixers', brand: 'SEF', model: 'VELA-CS', kind: 'mixer-concealed', finishes: MIX2, price: 2950,
  name: L('خلاط دش دفن سيفارو فيلا', 'Sefaro Vela concealed shower mixer', 'Sefaro Vela Unterputz-Brausearmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc40], ['mounting', V.concealed], ['warranty', V.years(7)]] });
p({ cat: 'c-bath-mixers', brand: 'SEF', model: 'ARCO-BS', kind: 'mixer-bath', finishes: ['chrome', 'gold'], price: 3150,
  name: L('خلاط بانيو سيفارو أركو', 'Sefaro Arco bath mixer', 'Sefaro Arco Wannenarmatur'),
  specs: [['material', V.brass], ['cartridge', V.disc40], ['mounting', V.wall], ['warranty', V.years(7)]] });

// Mixers — bidet sprays
p({ cat: 'c-bidet-sprays', brand: 'NIL', model: 'SH-V', kind: 'bidet-spray', finishes: MIX2, price: 450,
  name: L('شطاف بمحبس نيلورا', 'Nilora bidet spray with valve', 'Nilora Bidet-Handbrause mit Ventil'),
  specs: [['material', V.brass], ['length', L('خرطوم 1.2 متر', 'Hose 1.2 m', 'Schlauch 1,2 m')]] });
p({ cat: 'c-bidet-sprays', brand: 'NIL', model: 'SH-CM', kind: 'mixer-concealed', art: { shape: 'bidet' }, finishes: MIX3, price: 1250,
  name: L('خلاط شطاف دفن نيلورا', 'Nilora concealed bidet mixer', 'Nilora Unterputz-Bidetarmatur'),
  specs: [['material', V.brass], ['mounting', V.concealed], ['warranty', V.years(5)]] });
p({ cat: 'c-bidet-sprays', brand: 'SEF', model: 'SH-SET', kind: 'bidet-spray', finishes: ['chrome', 'gold'], price: 780,
  name: L('طقم شطاف سيفارو', 'Sefaro bidet spray set', 'Sefaro Bidet-Handbrausen-Set'),
  specs: [['material', V.brass], ['length', L('خرطوم 1.5 متر', 'Hose 1.5 m', 'Schlauch 1,5 m')]] });

// Shower systems
p({ cat: 'c-shower-columns', brand: 'NIL', model: 'MIRA-SC', kind: 'shower-column', finishes: MIX3, price: 5450, featured: true,
  name: L('عامود دش نيلورا ميرا بالخلاط', 'Nilora Mira shower column with mixer', 'Nilora Mira Duschsäule mit Armatur'),
  specs: [['material', V.brass], ['dimensions', L('طاسة 25 سم', 'Head 25 cm', 'Kopfbrause 25 cm')], ['functions', L('طاسة + يد سماعة', 'Rain + hand shower', 'Kopf- + Handbrause')]] });
p({ cat: 'c-shower-columns', brand: 'SEF', model: 'RAIN30', kind: 'shower-column', art: { shape: 'square' }, finishes: MIX2, price: 7900,
  name: L('عامود دش سيفارو رين 30 سم', 'Sefaro Rain 30 cm shower column', 'Sefaro Rain Duschsäule 30 cm'),
  specs: [['material', V.brass], ['dimensions', L('طاسة 30 سم', 'Head 30 cm', 'Kopfbrause 30 cm')], ['functions', L('طاسة + يد سماعة + حنفية', 'Rain + hand shower + spout', 'Kopf- + Handbrause + Auslauf')]] });
p({ cat: 'c-shower-columns', brand: 'NIL', model: 'DUNA-SC', kind: 'shower-column', price: 3650, finishes: ['chrome'],
  name: L('عامود دش نيلورا دونا 2×1', 'Nilora Duna 2-in-1 shower column', 'Nilora Duna Duschsäule 2-in-1'),
  specs: [['material', V.brass], ['functions', L('طاسة + يد سماعة', 'Rain + hand shower', 'Kopf- + Handbrause')]] });
p({ cat: 'c-hand-showers', brand: 'NIL', model: 'HS-RAIL', kind: 'hand-shower', art: { shape: 'rail' }, finishes: MIX2, price: 980,
  name: L('مجموعة سماعة نيلورا بمسطرة', 'Nilora hand shower set with rail', 'Nilora Brauseset mit Stange'),
  specs: [['length', L('مسطرة 70 سم', 'Rail 70 cm', 'Stange 70 cm')], ['functions', L('3 وظائف', '3 functions', '3 Funktionen')]] });
p({ cat: 'c-hand-showers', brand: 'SEF', model: 'HS-3F', kind: 'hand-shower', finishes: MIX3, price: 420,
  name: L('يد سماعة سيفارو 3 وظائف', 'Sefaro 3-function hand shower', 'Sefaro Handbrause, 3 Funktionen'),
  specs: [['functions', L('3 وظائف', '3 functions', '3 Funktionen')]] });
p({ cat: 'c-hand-showers', brand: 'VAL', model: 'HOSE', kind: 'flex-hose', art: { ends: 'shower' },
  name: L('خرطوم دش استانلس', 'Stainless shower hose', 'Edelstahl-Brauseschlauch'),
  sizes: [S('150', L('1.5 متر', '1.5 m', '1,5 m'), 120), S('200', L('2 متر', '2 m', '2 m'), 150)], specs: [['material', V.steel304]] });

// Sanitary ware — toilets
p({ cat: 'c-toilets', brand: 'KER', model: 'NOVA-1P', kind: 'toilet', art: { shape: 'onepiece' }, finishes: ['white', 'ivory'], price: 6950, featured: true,
  name: L('قاعدة كيراسترا نوفا قطعة واحدة', 'Kerastra Nova one-piece toilet', 'Kerastra Nova Stand-WC einteilig'),
  specs: [['material', V.ceramic], ['flush', V.dual], ['mounting', V.floor], ['warranty', V.years(10)]] });
p({ cat: 'c-toilets', brand: 'KER', model: 'LINA-CC', kind: 'toilet', finishes: ['white', 'ivory'], price: 3950,
  name: L('قاعدة كيراسترا لينا بالصندوق', 'Kerastra Lina close-coupled toilet', 'Kerastra Lina Stand-WC mit Spülkasten'),
  specs: [['material', V.ceramic], ['flush', V.dual], ['mounting', V.floor], ['warranty', V.years(10)]] });
p({ cat: 'c-toilets', brand: 'KER', model: 'NOVA-WH', kind: 'toilet', art: { shape: 'wallhung' }, finishes: ['white', 'black'], price: 4850,
  name: L('قاعدة معلقة كيراسترا نوفا', 'Kerastra Nova wall-hung toilet', 'Kerastra Nova Wand-WC'),
  specs: [['material', V.ceramic], ['mounting', V.wall], ['warranty', V.years(10)]] });
p({ cat: 'c-toilets', brand: 'KER', model: 'CMP-RL', kind: 'toilet', price: 4450, finishes: ['white'],
  name: L('قاعدة كيراسترا كومباكت بدون حافة', 'Kerastra compact rimless toilet', 'Kerastra Kompakt-WC spülrandlos'),
  specs: [['material', V.ceramic], ['flush', V.dual], ['warranty', V.years(10)]] });

// Sanitary ware — basins
p({ cat: 'c-basins', brand: 'KER', model: 'LINA-PB', kind: 'basin', art: { shape: 'pedestal' }, finishes: ['white', 'ivory'], price: 1650,
  name: L('حوض كيراسترا لينا بالرجل', 'Kerastra Lina pedestal basin', 'Kerastra Lina Waschbecken mit Säule'),
  specs: [['material', V.ceramic], ['dimensions', L('55 × 45 سم', '55 × 45 cm', '55 × 45 cm')]] });
p({ cat: 'c-basins', brand: 'KER', model: 'NOVA-CT', kind: 'basin', art: { shape: 'countertop' }, finishes: ['white', 'black'], price: 2250,
  name: L('حوض كيراسترا نوفا فوق الرخامة', 'Kerastra Nova countertop basin', 'Kerastra Nova Aufsatzwaschbecken'),
  specs: [['material', V.ceramic], ['dimensions', L('50 × 38 سم', '50 × 38 cm', '50 × 38 cm')]] });
p({ cat: 'c-basins', brand: 'KER', model: 'WALL-B', kind: 'basin', art: { shape: 'wall' },
  name: L('حوض كيراسترا معلق', 'Kerastra wall-hung basin', 'Kerastra Wandwaschbecken'),
  sizes: [S('45', cm(45), 950), S('50', cm(50), 1100), S('60', cm(60), 1350)], specs: [['material', V.ceramic], ['mounting', V.wall]] });
p({ cat: 'c-basins', brand: 'KER', model: 'CAB', kind: 'basin', art: { shape: 'cabinet' },
  name: L('حوض كيراسترا بوحدة خشب', 'Kerastra basin with vanity unit', 'Kerastra Waschtisch mit Unterschrank'),
  sizes: [S('60', cm(60), 5900), S('80', cm(80), 7400)], specs: [['material', L('بورسلين + خشب MDF مقاوم للرطوبة', 'Vitreous china + moisture-resistant MDF', 'Sanitärporzellan + feuchtebeständiges MDF')]] });

// Kitchen sinks — stainless
p({ cat: 'c-steel-sinks', brand: 'LUM', model: 'S1', kind: 'sink', art: { bowls: 1 }, featured: true,
  name: L('حوض مطبخ استانلس لومارو حوض واحد', 'Lumaro single-bowl stainless sink', 'Lumaro Edelstahlspüle, ein Becken'),
  sizes: [S('6045', L('60 × 45 سم', '60 × 45 cm', '60 × 45 cm'), 1450), S('8050', L('80 × 50 سم', '80 × 50 cm', '80 × 50 cm'), 1850)],
  specs: [['material', V.steel304], ['bowls', '1']] });
p({ cat: 'c-steel-sinks', brand: 'LUM', model: 'S2', kind: 'sink', art: { bowls: 2 },
  name: L('حوض مطبخ استانلس لومارو حوضين', 'Lumaro double-bowl stainless sink', 'Lumaro Edelstahlspüle, zwei Becken'),
  sizes: [S('10050', L('100 × 50 سم', '100 × 50 cm', '100 × 50 cm'), 2650), S('12050', L('120 × 50 سم', '120 × 50 cm', '120 × 50 cm'), 3150)],
  specs: [['material', V.steel304], ['bowls', '2']] });
p({ cat: 'c-steel-sinks', brand: 'LUM', model: 'S1D', kind: 'sink', art: { bowls: 1, drainer: true },
  name: L('حوض مطبخ استانلس لومارو بجناح', 'Lumaro stainless sink with drainer', 'Lumaro Edelstahlspüle mit Abtropffläche'),
  sizes: [S('10050', L('100 × 50 سم', '100 × 50 cm', '100 × 50 cm'), 2250), S('12050', L('120 × 50 سم', '120 × 50 cm', '120 × 50 cm'), 2750)],
  specs: [['material', V.steel304], ['bowls', '1']] });

// Kitchen sinks — granite
p({ cat: 'c-granite-sinks', brand: 'LUM', model: 'G1', kind: 'sink', art: { bowls: 1, speckle: true }, finishes: ['graniteBlack', 'graniteBeige', 'graniteGrey'], price: 3450,
  name: L('حوض مطبخ جرانيت لومارو', 'Lumaro granite sink', 'Lumaro Granitspüle'),
  specs: [['material', V.granite], ['bowls', '1'], ['dimensions', L('80 × 50 سم', '80 × 50 cm', '80 × 50 cm')]] });
p({ cat: 'c-granite-sinks', brand: 'LUM', model: 'G2', kind: 'sink', art: { bowls: 2, speckle: true }, finishes: ['graniteBlack', 'graniteGrey'], price: 4650,
  name: L('حوض مطبخ جرانيت لومارو حوضين', 'Lumaro granite double-bowl sink', 'Lumaro Granitspüle, zwei Becken'),
  specs: [['material', V.granite], ['bowls', '2'], ['dimensions', L('116 × 50 سم', '116 × 50 cm', '116 × 50 cm')]] });
p({ cat: 'c-granite-sinks', brand: 'LUM', model: 'G1D', kind: 'sink', art: { bowls: 1, drainer: true, speckle: true }, finishes: ['graniteBlack', 'graniteBeige'], price: 4150,
  name: L('حوض مطبخ جرانيت لومارو بجناح', 'Lumaro granite sink with drainer', 'Lumaro Granitspüle mit Abtropffläche'),
  specs: [['material', V.granite], ['bowls', '1'], ['dimensions', L('100 × 50 سم', '100 × 50 cm', '100 × 50 cm')]] });

// Accessories — bathroom
p({ cat: 'c-bath-accessories', brand: 'LUM', model: 'TB', kind: 'towel-bar', finishes: MIX3,
  name: L('شماعة فوطة لومارو', 'Lumaro towel bar', 'Lumaro Handtuchstange'),
  sizes: [S('60', cm(60), 380), S('80', cm(80), 450)], specs: [['material', V.steel304]] });
p({ cat: 'c-bath-accessories', brand: 'LUM', model: 'RH', kind: 'roll-holder', finishes: MIX3, price: 260,
  name: L('حامل مناديل لومارو', 'Lumaro toilet roll holder', 'Lumaro Papierrollenhalter'), specs: [['material', V.steel304]] });
p({ cat: 'c-bath-accessories', brand: 'LUM', model: 'HK', kind: 'hook', finishes: MIX3, price: 95,
  name: L('شماعة روب مفردة لومارو', 'Lumaro robe hook', 'Lumaro Bademantelhaken'), specs: [['material', V.steel304]] });
p({ cat: 'c-bath-accessories', brand: 'SEF', model: 'SD', kind: 'soap-dish', finishes: MIX2, price: 180,
  name: L('صبانة سيفارو', 'Sefaro soap dish', 'Sefaro Seifenschale'), specs: [['material', V.brass]] });
p({ cat: 'c-bath-accessories', brand: 'LUM', model: 'ACC4', kind: 'acc-set', finishes: MIX3, price: 990,
  name: L('طقم إكسسوار حمام 4 قطع لومارو', 'Lumaro 4-piece bathroom accessory set', 'Lumaro Badaccessoire-Set, 4-teilig'),
  specs: [['material', V.steel304], ['functions', L('شماعة + حامل مناديل + شماعة روب + صبانة', 'Towel bar + roll holder + hook + soap dish', 'Stange + Rollenhalter + Haken + Seifenschale')]] });

// Accessories — kitchen
p({ cat: 'c-kitchen-accessories', brand: 'LUM', model: 'DR', kind: 'dish-rack', price: 650,
  name: L('مصفاة أطباق استانلس لومارو', 'Lumaro stainless dish rack', 'Lumaro Edelstahl-Abtropfgestell'), specs: [['material', V.steel304]] });
p({ cat: 'c-kitchen-accessories', brand: 'LUM', model: 'SPD', kind: 'dispenser', finishes: MIX2, price: 290,
  name: L('موزع صابون للحوض لومارو', 'Lumaro sink soap dispenser', 'Lumaro Spülmittelspender'), specs: [['material', V.steel304]] });
p({ cat: 'c-kitchen-accessories', brand: 'LUM', model: 'STR', kind: 'strainer', price: 85,
  name: L('مصفاة حوض مطبخ', 'Kitchen sink strainer basket', 'Spülbecken-Siebkorb'), specs: [['material', V.steel304]] });

// Sets (bundles): the price is below the sum of the parts; stock comes from the parts.
const BUNDLES = [
  { cat: 'c-bathroom-sets', model: 'SET-NOVA', art: { kind: 'set', shape: 'bath' }, featured: true,
    name: L('طقم حمام كامل نوفا', 'Nova complete bathroom set', 'Nova Komplett-Badset'),
    parts: [['NOVA-1P', 'white', 1], ['NOVA-CT', 'white', 1], ['MIRA-B', 'chrome', 1], ['SH-V', 'chrome', 1], ['AV-1212', 'chrome', 2], ['BT', 'chrome', 1]] },
  { cat: 'c-bathroom-sets', model: 'SET-LINA', art: { kind: 'set', shape: 'bath' },
    name: L('طقم حمام لينا', 'Lina bathroom set', 'Lina Badset'),
    parts: [['LINA-CC', 'white', 1], ['LINA-PB', 'white', 1], ['DUNA-B', 'chrome', 1], ['AV-1212', 'chrome', 2]] },
  { cat: 'c-kitchen-sets', model: 'SET-KIT', art: { kind: 'set', shape: 'kitchen' }, featured: true,
    name: L('طقم مطبخ سورا', 'Sora kitchen set', 'Sora Küchenset'),
    parts: [['S1', null, 1, '8050'], ['SORA-K', 'chrome', 1], ['AV-1238', null, 2], ['STR', null, 1]] },
];

// ── Builders ────────────────────────────────────────────────────────────────────────────────────
const BRAND_BY_CODE = Object.fromEntries(BRANDS.map((b) => [b.code, b]));

function descriptionFor(def) {
  const key = def.kind === 'acc-set' || ['towel-bar', 'roll-holder', 'hook', 'soap-dish'].includes(def.kind)
    ? 'accessory'
    : ['dish-rack', 'dispenser', 'strainer'].includes(def.kind)
      ? 'kitchenAccessory'
      : def.kind;
  return KIND_TEXT[key] || KIND_TEXT.accessory;
}

function buildVariants(def, productId, sku) {
  // One finish and no sizes is not a choice: the product simply has that finish.
  const choosesFinish = def.finishes && def.finishes.length > 1;
  const finishes = choosesFinish ? def.finishes : [null];
  const sizes = def.sizes || [null];
  if (!choosesFinish && !def.sizes) return [];
  const out = [];
  for (const f of finishes) {
    for (const s of sizes) {
      const finish = f ? FINISHES[f] : null;
      const base = s ? s.price : def.price;
      const price = Math.round(base * (finish ? finish.factor : 1));
      const codeParts = [finish?.code, s?.code].filter(Boolean);
      out.push({
        id: `${productId}-${codeParts.join('-').toLowerCase()}`,
        sku: `${sku}-${codeParts.join('-')}`,
        colorCode: finish ? finish.code : null,
        colorName: finish ? finish.name : null,
        colorHex: finish ? finish.hex : null,
        finishKey: f,
        sizeCode: s ? s.code : null,
        sizeLabel: s ? s.label : null,
        price,
        isActive: true,
        isHidden: false,
      });
    }
  }
  return out;
}

function buildProducts() {
  const products = [];
  RAW.forEach((def, i) => {
    const n = i + 1;
    const id = `p-${String(n).padStart(3, '0')}`;
    const sku = `${def.brand}-${def.model}`;
    const variants = buildVariants(def, id, sku);
    const price = variants.length ? Math.min(...variants.map((v) => v.price)) : def.price;
    products.push({
      id,
      sku,
      modelCode: def.model,
      slug: `${slugify(def.name.en).slice(0, 48).replace(/-+$/, '')}-${n}`,
      name: def.name.en,
      nameAr: def.name.ar,
      nameDe: def.name.de,
      brandCode: def.brand,
      categoryId: def.cat,
      productType: 'simple',
      art: { kind: def.kind, ...(def.art || {}) },
      defaultFinish: def.finishes ? def.finishes[0] : null,
      price,
      compareAtPrice: def.compareAt || null,
      isActive: true,
      isFeatured: !!def.featured,
      description: descriptionFor(def),
      specifications: (def.specs || []).map(([key, value]) => ({ key, label: SPEC_LABELS[key], value })),
      variants: variants.map((v) => ({ ...v, priceOverride: v.price === price ? null : v.price })),
      bundle: null,
    });
  });

  const byModel = Object.fromEntries(products.map((pr) => [pr.modelCode, pr]));
  BUNDLES.forEach((b, i) => {
    const n = products.length + 1;
    const id = `p-${String(n).padStart(3, '0')}`;
    const components = b.parts.map(([model, finishKey, quantity, sizeCode]) => {
      const part = byModel[model];
      if (!part) throw new Error(`Bundle part ${model} is missing`);
      const variant = part.variants.find(
        (v) => (finishKey ? v.finishKey === finishKey : true) && (sizeCode ? v.sizeCode === sizeCode : true),
      ) || null;
      if (part.variants.length && !variant) throw new Error(`Bundle part ${model} has no variant ${finishKey}/${sizeCode}`);
      return { productId: part.id, variantId: variant ? variant.id : null, quantity };
    });
    const partsTotal = components.reduce((sum, c) => {
      const part = products.find((pr) => pr.id === c.productId);
      const v = part.variants.find((x) => x.id === c.variantId);
      return sum + (v ? v.price : part.price) * c.quantity;
    }, 0);
    const price = Math.round((partsTotal * 0.92) / 10) * 10;
    const brandCode = byModel[b.parts[0][0]].brandCode;
    products.push({
      id,
      sku: `SET-${b.model.replace('SET-', '')}`,
      modelCode: b.model,
      slug: `${slugify(b.name.en)}-${n}`,
      name: b.name.en,
      nameAr: b.name.ar,
      nameDe: b.name.de,
      brandCode,
      categoryId: b.cat,
      productType: 'bundle',
      art: b.art,
      price,
      compareAtPrice: null,
      isActive: true,
      isFeatured: !!b.featured,
      description: KIND_TEXT.set,
      specifications: [],
      variants: [],
      bundle: { availableAsBundle: true, components, partsTotal },
    });
    void i;
  });
  return products;
}

export const PRODUCTS = buildProducts();

/** The one running promotion: 15 % off Nilora mixers (the whole «Water mixers» branch). */
export const PROMOTIONS = [
  {
    id: 'promo-nilora-mixers',
    title: L('أسبوع خلاطات نيلورا', 'Nilora mixer week', 'Nilora Armaturen-Woche'),
    text: L(
      'خصم 15٪ على كل خلاطات نيلورا — عرض تجريبى.',
      '15 % off every Nilora mixer — a demo offer.',
      '15 % Rabatt auf alle Nilora-Armaturen — ein Demo-Angebot.',
    ),
    discountPercent: 15,
    appliesTo: { brandCode: 'NIL', categoryId: 'c-mixers' },
    isActive: true,
  },
];

/** Demo coupon (the discount comes off before VAT). */
export const COUPONS = [{ code: 'DEMO10', percent: 10 }];

/** Delivery fee by governorate (simulated; pickup from the showroom is free). */
export const GOVERNORATES = [
  { code: 'cairo', fee: 150 },
  { code: 'giza', fee: 150 },
  { code: 'qalyubia', fee: 200 },
  { code: 'alexandria', fee: 250 },
  { code: 'sharqia', fee: 250 },
  { code: 'other', fee: 300 },
];
