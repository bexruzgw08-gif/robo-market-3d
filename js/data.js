// Product database, categories and the English → Uzbek sentence system.

export const CATEGORIES = [
  { id: 'drinks',      en: 'Drinks',             uz: 'Ichimliklar',          color: 0x2f80ed },
  { id: 'juice',       en: 'Juices',             uz: 'Sharbatlar',           color: 0xf2994a },
  { id: 'dairy',       en: 'Dairy & Eggs',       uz: 'Sut mahsulotlari',     color: 0x56ccf2 },
  { id: 'grocery',     en: 'Bakery & Grocery',   uz: 'Non va oziq-ovqat',    color: 0xc98a3e },
  { id: 'fruit',       en: 'Fruit',              uz: 'Mevalar',              color: 0xeb5757 },
  { id: 'vegetables',  en: 'Vegetables',         uz: 'Sabzavotlar',          color: 0x27ae60 },
  { id: 'snacks',      en: 'Snacks',             uz: 'Gazaklar',             color: 0x9b51e0 },
  { id: 'electronics', en: 'Electronics',        uz: 'Elektronika',          color: 0x4f4f4f },
  { id: 'cleaning',    en: 'Cleaning',           uz: 'Tozalash vositalari',  color: 0x00a6a6 },
  { id: 'household',   en: 'Household',          uz: "Ro'zg'or buyumlari",   color: 0xe0559b },
];

// unit: [singular, plural] English container word. uzUnit: Uzbek counter word ("bir shisha suv").
// c: countable without a container ("two apples" / "ikkita olma").
// model: procedural 3D shape. col/acc: body and label/cap colours.
export const PRODUCTS = [
  { id: 'water',     name: 'Water Bottle',    en: 'water',           unit: ['bottle', 'bottles'], uz: 'suv',                  uzUnit: 'shisha', uzName: 'Bir shisha suv',    cat: 'drinks',      model: 'bottle', col: 0x9fd8ff, acc: 0x1d6fd8 },
  { id: 'sparkling', name: 'Sparkling Water', en: 'sparkling water', unit: ['bottle', 'bottles'], uz: 'gazli suv',            uzUnit: 'shisha', uzName: 'Gazli suv',         cat: 'drinks',      model: 'bottle', col: 0xb8f0d0, acc: 0x0f9d58 },
  { id: 'cola',      name: 'Cola',            en: 'cola',            unit: ['can', 'cans'],       uz: 'kola',                 uzUnit: 'banka',  uzName: 'Kola',              cat: 'drinks',      model: 'can',    col: 0xd62828, acc: 0xffffff },
  { id: 'ojuice',    name: 'Orange Juice',    en: 'orange juice',    unit: ['carton', 'cartons'], uz: 'apelsin sharbati',     uzUnit: 'quti',   uzName: 'Apelsin sharbati',  cat: 'juice',       model: 'carton', col: 0xffa62b, acc: 0xffffff },
  { id: 'ajuice',    name: 'Apple Juice',     en: 'apple juice',     unit: ['carton', 'cartons'], uz: 'olma sharbati',        uzUnit: 'quti',   uzName: 'Olma sharbati',     cat: 'juice',       model: 'carton', col: 0x8bc34a, acc: 0xffffff },
  { id: 'milk',      name: 'Milk',            en: 'milk',            unit: ['bottle', 'bottles'], uz: 'sut',                  uzUnit: 'shisha', uzName: 'Sut',               cat: 'dairy',       model: 'bottle', col: 0xffffff, acc: 0x2f80ed },
  { id: 'eggs',      name: 'Eggs',            en: 'eggs',            unit: ['box', 'boxes'],      uz: 'tuxum',                uzUnit: 'quti',   uzName: 'Tuxum',             cat: 'dairy',       model: 'eggs',   col: 0xd9c3a0, acc: 0xfff4e0 },
  { id: 'cheese',    name: 'Cheese',          en: 'cheese',          unit: ['piece', 'pieces'],   uz: 'pishloq',              uzUnit: "bo'lak", uzName: 'Pishloq',           cat: 'dairy',       model: 'cheese', col: 0xffd23f, acc: 0xf2b705 },
  { id: 'yogurt',    name: 'Yogurt',          en: 'yogurt',          unit: ['cup', 'cups'],       uz: 'yogurt',               uzUnit: 'stakan', uzName: 'Yogurt',            cat: 'dairy',       model: 'cup',    col: 0xffffff, acc: 0xe0559b },
  { id: 'bread',     name: 'Bread',           en: 'bread',           unit: ['loaf', 'loaves'],    uz: 'non',                  uzUnit: null,     uzName: 'Non',               cat: 'grocery',     model: 'loaf',   col: 0xc8873a, acc: 0xe9b872 },
  { id: 'rice',      name: 'Rice',            en: 'rice',            unit: ['bag', 'bags'],       uz: 'guruch',               uzUnit: 'paket',  uzName: 'Guruch',            cat: 'grocery',     model: 'bag',    col: 0xf5f0e1, acc: 0x27ae60 },
  { id: 'cereal',    name: 'Cereal',          en: 'cereal',          unit: ['box', 'boxes'],      uz: 'nonushta yormasi',     uzUnit: 'quti',   uzName: 'Nonushta yormasi',  cat: 'grocery',     model: 'box',    col: 0xf2c94c, acc: 0xeb5757 },
  { id: 'apples',    name: 'Apples',          en: 'apple', pl: 'apples',          c: true,         uz: 'olma',                 uzUnit: null,     uzName: 'Olmalar',           cat: 'fruit',       model: 'fruit',  col: 0xd7263d, acc: 0x3a7d2c, size: 0.085 },
  { id: 'bananas',   name: 'Bananas',         en: 'banana', pl: 'bananas',        c: true,         uz: 'banan',                uzUnit: null,     uzName: 'Bananlar',          cat: 'fruit',       model: 'banana', col: 0xffe135, acc: 0x6b4f1d },
  { id: 'oranges',   name: 'Oranges',         en: 'orange', pl: 'oranges',        c: true,         uz: 'apelsin',              uzUnit: null,     uzName: 'Apelsinlar',        cat: 'fruit',       model: 'fruit',  col: 0xff8c00, acc: 0x3a7d2c, size: 0.09 },
  { id: 'tomatoes',  name: 'Tomatoes',        en: 'tomato', pl: 'tomatoes',       c: true,         uz: 'pomidor',              uzUnit: null,     uzName: 'Pomidorlar',        cat: 'vegetables',  model: 'fruit',  col: 0xe63946, acc: 0x2d6a4f, size: 0.075 },
  { id: 'potatoes',  name: 'Potatoes',       en: 'potato', pl: 'potatoes',        c: true,         uz: 'kartoshka',            uzUnit: null,     uzName: 'Kartoshka',         cat: 'vegetables',  model: 'potato', col: 0xb08850, acc: 0x8a6a3a },
  { id: 'carrots',   name: 'Carrots',         en: 'carrot', pl: 'carrots',        c: true,         uz: 'sabzi',                uzUnit: null,     uzName: 'Sabzi',             cat: 'vegetables',  model: 'carrot', col: 0xf77f00, acc: 0x2d6a4f },
  { id: 'chocolate', name: 'Chocolate',       en: 'chocolate',       unit: ['bar', 'bars'],       uz: 'shokolad',             uzUnit: null,     uzName: 'Shokolad',          cat: 'snacks',      model: 'bar',    col: 0x5b3a29, acc: 0xc9a227 },
  { id: 'chips',     name: 'Chips',           en: 'chips',           unit: ['bag', 'bags'],       uz: 'chips',                uzUnit: 'paket',  uzName: 'Chips',             cat: 'snacks',      model: 'bag',    col: 0xffcc00, acc: 0xd62828 },
  { id: 'cookies',   name: 'Cookies',         en: 'cookies',         unit: ['pack', 'packs'],     uz: 'pechenye',             uzUnit: 'paket',  uzName: 'Pechenye',          cat: 'snacks',      model: 'box',    col: 0x3d5a80, acc: 0xc98a3e, flat: true },
  { id: 'batteries', name: 'Batteries',       en: 'batteries',       unit: ['pack', 'packs'],     uz: 'batareyka',            uzUnit: 'paket',  uzName: 'Batareykalar',      cat: 'electronics', model: 'box',    col: 0x111111, acc: 0xf2c94c, small: true },
  { id: 'headphones',name: 'Headphones',      en: 'headphones',      unit: ['pair', 'pairs'],     uz: 'quloqchin',            uzUnit: null,     uzName: 'Quloqchin',         cat: 'electronics', model: 'headphones', col: 0x222222, acc: 0x2f80ed },
  { id: 'bulb',      name: 'Light Bulb',      en: 'light bulb', pl: 'light bulbs', c: true,       uz: 'lampochka',            uzUnit: null,     uzName: 'Lampochka',         cat: 'electronics', model: 'bulb',   col: 0xfff7c2, acc: 0x9e9e9e },
  { id: 'detergent', name: 'Laundry Detergent', en: 'laundry detergent', unit: ['box', 'boxes'], uz: 'kir yuvish kukuni',    uzUnit: 'quti',   uzName: 'Kir yuvish kukuni', cat: 'cleaning',    model: 'box',    col: 0x00a6a6, acc: 0xff6b6b },
  { id: 'dishsoap',  name: 'Dish Soap',       en: 'dish soap',       unit: ['bottle', 'bottles'], uz: 'idish yuvish vositasi', uzUnit: 'shisha', uzName: 'Idish yuvish vositasi', cat: 'cleaning', model: 'spray',  col: 0x7ed957, acc: 0xffffff },
  { id: 'sponge',    name: 'Sponge',          en: 'sponge', pl: 'sponges',        c: true,         uz: 'gubka',                uzUnit: null,     uzName: 'Gubka',             cat: 'cleaning',    model: 'sponge', col: 0xffe066, acc: 0x2a9d8f },
  { id: 'shampoo',   name: 'Shampoo',         en: 'shampoo',         unit: ['bottle', 'bottles'], uz: 'shampun',              uzUnit: 'shisha', uzName: 'Shampun',           cat: 'household',   model: 'spray',  col: 0x9b5de5, acc: 0xffffff },
  { id: 'soap',      name: 'Soap',            en: 'soap',            unit: ['bar', 'bars'],       uz: 'sovun',                uzUnit: null,     uzName: 'Sovun',             cat: 'household',   model: 'soap',   col: 0xf7b2d9, acc: 0xffffff },
  { id: 'toothpaste',name: 'Toothpaste',      en: 'toothpaste',      unit: ['tube', 'tubes'],     uz: 'tish pastasi',         uzUnit: null,     uzName: 'Tish pastasi',      cat: 'household',   model: 'tube',   col: 0xffffff, acc: 0x2f80ed },
  { id: 'tissue',    name: 'Toilet Paper',    en: 'toilet paper',    unit: ['pack', 'packs'],     uz: "tualet qog'ozi",       uzUnit: 'paket',  uzName: "Tualet qog'ozi",    cat: 'household',   model: 'roll',   col: 0xffffff, acc: 0x56ccf2 },
];
export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Products that are easy to confuse — used to make Intermediate orders trickier.
export const SIMILAR = [['water', 'sparkling'], ['ojuice', 'oranges'], ['ajuice', 'apples'], ['soap', 'dishsoap'], ['chips', 'cookies']];

export const LEVELS = {
  1: { name: 'Beginner',     uzName: "Boshlang'ich", desc: 'Simple English requests and common products. Uzbek translation is shown automatically.', maxCustomers: 1, maxItems: 1, maxQty: 2, patience: 240, autoTranslate: true,  rate: 0.85, next: 150 },
  2: { name: 'Intermediate', uzName: "O'rta",        desc: 'Longer sentences, several products per order, more customers and similar product names.',  maxCustomers: 2, maxItems: 2, maxQty: 3, patience: 200, autoTranslate: false, rate: 0.95, next: 400 },
  3: { name: 'Advanced',     uzName: 'Yuqori',       desc: 'Natural conversational English, complex quantities, different accents and several orders at once.', maxCustomers: 3, maxItems: 3, maxQty: 4, patience: 170, autoTranslate: false, rate: 1.02, next: Infinity },
};

const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five'];
const UZ_NUM = ['', 'bir', 'ikki', 'uch', "to'rt", 'besh'];
const UZ_NUM_TA = ['', 'bitta', 'ikkita', 'uchta', "to'rtta", 'beshta'];

const article = (w) => (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;

export function enPhrase(p, qty) {
  if (p.c) return qty === 1 ? article(p.en) : `${EN_NUM[qty]} ${p.pl}`;
  return qty === 1 ? `${article(p.unit[0])} of ${p.en}` : `${EN_NUM[qty]} ${p.unit[1]} of ${p.en}`;
}
export function uzPhrase(p, qty) {
  return p.uzUnit ? `${UZ_NUM[qty]} ${p.uzUnit} ${p.uz}` : `${UZ_NUM_TA[qty]} ${p.uz}`;
}
function enList(parts) {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}
function uzList(parts) {
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} va ${parts.at(-1)}`;
}

// Each template returns a matching [English, Uzbek] pair.
const TEMPLATES = {
  1: [
    (e, u) => [`I need ${e}.`, `Menga ${u} kerak.`],
    (e, u) => [`Can I have ${e}, please?`, `Iltimos, menga ${u} bera olasizmi?`],
    (e, u) => [`Hello! I want ${e}.`, `Salom! Men ${u} xohlayman.`],
    (e, u) => [`${cap(e)}, please.`, `${cap(u)}, iltimos.`],
    (e, u) => [`Please give me ${e}.`, `Iltimos, menga ${u} bering.`],
  ],
  2: [
    (e, u) => [`Could you bring me ${e}?`, `Menga ${u} olib bera olasizmi?`],
    (e, u) => [`Excuse me, where can I find ${e}?`, `Kechirasiz, ${u}ni qayerdan topsam bo'ladi?`],
    (e, u) => [`I'm looking for ${e}.`, `Men ${u} qidiryapman.`],
    (e, u) => [`Hi, I'd like ${e}, please.`, `Salom, menga ${u} kerak edi, iltimos.`],
    (e, u) => [`Can you get me ${e}, please?`, `Iltimos, menga ${u} olib bera olasizmi?`],
    (e, u) => [`Good morning! Could I get ${e}?`, `Xayrli tong! Menga ${u} bera olasizmi?`],
  ],
  3: [
    (e, u) => [`Hi there! I'm in a bit of a rush — could you grab me ${e}?`, `Salom! Men biroz shoshib turibman — menga ${u} olib bera olasizmi?`],
    (e, u) => [`Sorry to bother you, I'm cooking dinner tonight and I still need ${e}.`, `Bezovta qilganim uchun uzr, bugun kechki ovqat tayyorlayapman va menga hali ${u} kerak.`],
    (e, u) => [`Before I head to the checkout, would you mind bringing me ${e}?`, `Kassaga borishimdan oldin, menga ${u} olib kelib bera olasizmi?`],
    (e, u) => [`Do you happen to have ${e}? I can't seem to find them anywhere.`, `Sizda ${u} bormi? Ularni hech qayerdan topa olmayapman.`],
    (e, u) => [`My shopping list says ${e} — could you sort that out for me?`, `Xarid ro'yxatimda ${u} yozilgan — shularni olib berolasizmi?`],
    (e, u) => [`I've been walking around for ages. Could you be a star and fetch me ${e}?`, `Ancha vaqtdan beri aylanib yuribman. Iltimos, menga ${u} olib kelib bera olasizmi?`],
  ],
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const rand = (a) => a[Math.floor(Math.random() * a.length)];

// Builds a random order for the level. `available` filters what can be requested.
export function makeRequest(level) {
  const L = LEVELS[level];
  const n = 1 + Math.floor(Math.random() * L.maxItems);
  const picks = [];
  // Intermediate likes to mix in a product with a confusable name.
  if (level === 2 && Math.random() < 0.5) {
    const pair = rand(SIMILAR);
    picks.push(PRODUCT_BY_ID[rand(pair)]);
  }
  while (picks.length < n) {
    const p = rand(PRODUCTS);
    if (!picks.includes(p)) picks.push(p);
  }
  const items = picks.map((p) => ({ product: p, qty: level === 1 ? (Math.random() < 0.7 ? 1 : 2) : 1 + Math.floor(Math.random() * L.maxQty) }));
  const en = enList(items.map((i) => enPhrase(i.product, i.qty)));
  const uz = uzList(items.map((i) => uzPhrase(i.product, i.qty)));
  const [english, uzbek] = rand(TEMPLATES[level])(en, uz);
  return { items, english, uzbek };
}

export const CUSTOMER_NAMES = ['Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'James', 'Mia', 'Lucas', 'Grace', 'Henry', 'Chloe', 'Jack'];
// Voice accents used by speechSynthesis (Advanced level mixes them).
export const ACCENTS = [
  { lang: 'en-US', label: 'American' },
  { lang: 'en-GB', label: 'British' },
  { lang: 'en-AU', label: 'Australian' },
  { lang: 'en-IN', label: 'Indian' },
];
export const THANKS = ['Thank you so much!', 'Perfect, thanks!', 'Great, that\'s exactly what I needed.', 'Brilliant, cheers!', 'Wonderful, have a nice day!'];
export const ANGRY = ['I can\'t wait any longer. Goodbye.', 'This is taking too long. I\'ll shop somewhere else.', 'Never mind, I\'m leaving.'];
