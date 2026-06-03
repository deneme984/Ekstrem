/**
 * @fileoverview Keyword-based auto-categorization engine for Turkish merchant names.
 * Used to automatically assign spending categories to credit card transactions.
 * All lookups are case-insensitive and accent-normalized.
 */

import { CATEGORIES } from './models.js';

/**
 * Map of category names to arrays of merchant/keyword patterns.
 * Patterns are matched case-insensitively against the normalized merchant name.
 * More specific keywords should be listed before more generic ones.
 *
 * @type {Object.<string, string[]>}
 */
const CATEGORY_KEYWORDS = {
  'Market': [
    'migros', 'bim', 'a101', 'carrefour', 'carrefourst', '┼ƒok', 'sok',
    'metro market', 'hakmar', 'file market', 'macrocenter', 'onur market',
    'kiler', 'bizim market', 'dia', 'tesco', 'epicerie', 'uyum market',
    'se├º market', 'tar─▒m market', 'kaz─▒m koyuncu', 'market', 's├╝permarket'
  ],

  'Online Al─▒┼ƒveri┼ƒ': [
    'trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor', 'morhipo',
    'boyner', 'lcwaikiki', 'zara', 'h&m', 'koton', 'mango', 'defacto',
    '├ºi├ºeksepeti', 'ciceksepeti', 'sahibinden', 'dolap', 'letgo',
    'pazarama', 'idefix', 'd&r', 'e-ticaret', 'eticaret', 'online'
  ],

  'Yemek': [
    'yemeksepeti', 'getir food', 'trendyol yemek', 'mcdonald', 'mcdonalds',
    'burger king', 'pizza hut', 'pizzaci', 'dominos', 'little caesars',
    'kfc', 'popeyes', 'subway', 'starbucks', 'gloria jeans', 'caribou',
    'dunkin', 'costa coffee', 'nero', 'simit saray─▒', 'simit sarayi',
    'pret', 'nando', '├ºay', 'kahve', 'kahveci', 'kafe', 'cafe',
    'restoran', 'restaurant', 'bistro', 'kebap', 'kebab', 'd├Âner', 'doner',
    'pide', 'lahmacun', 'b├Ârek', 'borek', 'kokore├º', 'kokorec',
    'balik', 'bal─▒k', 'deniz ├╝r├╝nleri', 'et lokantas─▒', 'et lokantasi',
    'fast food', 'tavuk', 'izgara', 'mangal', 'ocakba┼ƒ─▒', 'ocakbasi'
  ],

  'Ula┼ƒ─▒m': [
    'iett', 'metro istanbul', 'marmaray', 'izban', '├╝sk├╝dar', 'kad─▒k├Ây',
    'uber', 'bitaksi', 'bia taksi', 'taksi', 'taxi', 'taxim',
    'turkish airlines', 'thy', 'pegasus', 'sunexpress', 'anadolujet',
    'otogar', 'terminal', 'havaliman─▒', 'havaalani', 'airport',
    'otobus', 'otob├╝s', 'pamukkale', 'metro turizm', 'kamil ko├º',
    'kimilink', 'otopark', 'park ├╝cret', 'belpark', 'ispark',
    'dolmu┼ƒ', 'dolmus', 'vapur', 'feribot', 'ferry', 'ido',
    'renault', 'fiat', 'ara├º kiralama', 'rent a car', 'rentacar', 'avis', 'europcar',
    'interrail', 'tren', 'tcdd', 'yht', 'biletix', 'peron'
  ],

  'Akaryak─▒t': [
    'shell', 'bp', 'opet', 'petrol ofisi', 'total', 'aytemiz', 'moil',
    'lukoil', 'alpet', 'eko', 'go', 'akaryak─▒t', 'akaryakit',
    'benzin', 'motorin', 'lpg', 'petrol', 'istasyon'
  ],

  'E─ƒlence': [
    'netflix', 'exxen', 'gain', 'blutv', 'mubi', 'teve2', 'dizibox',
    'biletix', 'passo', 'sinecard', 'cinemaximum', 'cinetech',
    'cineplex', 'sinema', 'cinema', 'movie', 'film',
    'playstation', 'xbox', 'steam', 'epic games', 'nintendo',
    'spotify', 'apple music', 'amazon music', 'deezer',
    'lunapark', 'e─ƒlence merkezi', 'eglence', 'bowling', 'laser',
    'ka├º─▒┼ƒ odas─▒', 'kacis odasi', 'escape room', 'oyun salonu',
    'konser', 'tiyatro', 'm├╝ze', 'muze', 'festival'
  ],

  'Sa─ƒl─▒k': [
    'eczane', 'pharmacy', 'apotek', 'medikal', 'medical',
    'hastane', 'hastanesi', 'klinik', 'clinic', 'poliklinik',
    'doktor', 'doctor', 'di┼ƒ', 'dis hekimi', 'dental', 'dent',
    'laboratuvar', 'lab', 'mri', 'tomografi', 'ultrason',
    'optisyen', 'optik', 'g├Âzl├╝k', 'gozluk', 'lens',
    'berber', 'kuaf├Âr', 'kuafor', 'coiffure', 'g├╝zellik', 'guzellik',
    'spa', 'masaj', 'massage', 'hamam', 'wellness'
  ],

  'Giyim': [
    'lcw', 'lc waikiki', 'koton', 'defacto', 'mango', 'zara', 'bershka',
    'pull&bear', 'stradivarius', 'marks&spencer', 'marks spencer',
    'vakko', 'beymen', 'ipekyol', 'machka', 'network',
    'adidas', 'nike', 'puma', 'reebok', 'new balance', 'converse',
    'columbia', 'the north face', 'spor', 'spx', 'giyim', 'butik',
    'modanisa', 'trendyol moda', 'flo', 'polaris', 'ayakkab─▒', 'ayakkabi',
    '├ºanta', 'canta', 'kemer', 'kravat', 'g├Âmlek', 'gomlek', 'pantolon'
  ],

  'Sigorta': [
    'allianz', 'axa', 'generali', 'zurich', 'mapfre', 'sigorta',
    'eureko', 'groupama', 'ergo', 'hdi', 't├╝rkiye sigorta',
    'g├╝ne┼ƒ sigorta', 'gunes sigorta', 'magdeburger', 'aksigorta',
    'sa─ƒl─▒k sigortas─▒', 'kasko', 'trafik sigortas─▒', 'dask'
  ],

  'Fatura': [
    't├╝rk telekom', 'turk telekom', 'vodafone', 'turkcell', 'turknet',
    'superonline', 'kablonet', 'ba─ƒnet', 'bagnet', 'ttnet',
    'elektrik', 'do─ƒalgaz', 'dogalgaz', 'ayeda┼ƒ', 'ayedas',
    'teda┼ƒ', 'tedas', 'ba┼ƒkentgaz', 'baskentgaz', 'igda┼ƒ', 'igdas',
    'su fatura', 'iski', 'aski', 'belediye su', 'fatura'
  ],

  'Abonelik': [
    'netflix', 'spotify', 'youtube premium', 'apple', 'microsoft',
    'adobe', 'disney', 'hulu', 'paramount', 'hbo', 'amazon prime',
    'linkedin', 'dropbox', 'google one', 'icloud', 'setrow',
    'abonelik', 'subscription', 'premium', 'plus ├╝yelik'
  ],

  'E─ƒitim': [
    'udemy', 'coursera', 'edx', 'skillshare', 'pluralsight',
    'ders', 'kurs', 'kurslar', 'okul', '├╝niversite', 'universite',
    'kolej', 'dershane', 'et├╝t', 'etut', 'kitap', 'kitabevi',
    'd&r', 'pan', 'idefix', 'bilge adam', 'btek', 'yaz─▒l─▒m kursu',
    'sertifika', 'egitim', 'e─ƒitim'
  ],

  'Seyahat': [
    'booking', 'airbnb', 'otel', 'hotel', 'tatil', 'tur',
    'trivago', 'hotels.com', 'expedia', 'tripadvisor', 'enuygun',
    'tatilbudur', 'obilet', 'jollytur', 'neredekal',
    'turkish airlines', 'thy', 'pegasus', 'sunexpress',
    'havaliman─▒', 'airport', 'bagaj', 'baggage', 'visa fee',
    'konsoloslu', 'consulate', 'yurt d─▒┼ƒ─▒', 'yurt disi'
  ]
};

/**
 * Pre-computed flat lookup array for performance: [{keyword, category}]
 * Built once at module load time.
 * @type {Array<{keyword: string, category: string}>}
 */
const KEYWORD_INDEX = (() => {
  const index = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      index.push({ keyword: keyword.toLowerCase(), category });
    }
  }
  // Sort by keyword length descending so longer (more specific) keywords match first
  index.sort((a, b) => b.keyword.length - a.keyword.length);
  return index;
})();

/**
 * Maps a merchant name to the most appropriate spending category.
 * Uses keyword matching on the normalized (lowercase, accent-stripped) merchant name.
 * Returns 'Di─ƒer' when no keyword match is found.
 *
 * @param {string|null|undefined} merchantName - Raw or cleaned merchant name
 * @returns {string} One of the CATEGORIES values
 *
 * @example
 * mapCategory("MIGROS MARKET");         // "Market"
 * mapCategory("Trendyol");              // "Online Al─▒┼ƒveri┼ƒ"
 * mapCategory("STARBUCKS GALATAPORT"); // "Yemek"
 * mapCategory("Shell ─░stasyon");        // "Akaryak─▒t"
 * mapCategory(null);                    // "Di─ƒer"
 */
export function mapCategory(merchantName) {
  if (!merchantName || typeof merchantName !== 'string') return 'Di─ƒer';

  const normalized = _normalize(merchantName);

  for (const { keyword, category } of KEYWORD_INDEX) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }

  return 'Di─ƒer';
}

/**
 * Categorizes a batch of transactions in-place, assigning the `category` field.
 * Only sets the category if it is currently empty or 'Di─ƒer'.
 *
 * @param {import('./models.js').Transaction[]} transactions - Array of transaction objects
 * @returns {import('./models.js').Transaction[]} The same array with categories set
 */
export function categorizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];

  return transactions.map((tx) => {
    if (!tx) return tx;
    const needsCategory = !tx.category || tx.category === 'Di─ƒer';
    if (needsCategory) {
      return {
        ...tx,
        category: mapCategory(tx.merchantName || tx.description)
      };
    }
    return tx;
  });
}

/**
 * Returns all keywords registered for a given category.
 * Useful for debugging or UI display of category rules.
 *
 * @param {string} category - One of CATEGORIES
 * @returns {string[]} Array of keywords for the category, or [] if not found
 */
export function getKeywordsForCategory(category) {
  return CATEGORY_KEYWORDS[category] || [];
}

/**
 * Returns a summary of how many keywords are registered per category.
 *
 * @returns {Object.<string, number>} Map of category ÔåÆ keyword count
 */
export function getCategoryKeywordCounts() {
  const counts = {};
  for (const category of CATEGORIES) {
    counts[category] = (CATEGORY_KEYWORDS[category] || []).length;
  }
  return counts;
}

// ÔöÇÔöÇÔöÇ Private helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

/**
 * Normalizes a string for keyword matching:
 * - Converts to lowercase
 * - Strips Turkish-specific accents to ASCII equivalents
 * @param {string} str
 * @returns {string}
 * @private
 */
function _normalize(str) {
  return str
    .toLowerCase()
    .replace(/─ƒ/g, 'g')
    .replace(/├╝/g, 'u')
    .replace(/┼ƒ/g, 's')
    .replace(/─▒/g, 'i')
    .replace(/├Â/g, 'o')
    .replace(/├º/g, 'c')
    .replace(/─░/g, 'i')
    .trim();
}
