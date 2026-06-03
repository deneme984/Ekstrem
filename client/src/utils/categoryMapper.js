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
    'migros', 'bim', 'a101', 'carrefour', 'carrefourst', 'şok', 'sok',
    'metro market', 'hakmar', 'file market', 'macrocenter', 'onur market',
    'kiler', 'bizim market', 'dia', 'tesco', 'epicerie', 'uyum market',
    'seç market', 'tarım market', 'kazım koyuncu', 'market', 'süpermarket'
  ],

  'Online Alışveriş': [
    'trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor', 'morhipo',
    'boyner', 'lcwaikiki', 'zara', 'h&m', 'koton', 'mango', 'defacto',
    'çiçeksepeti', 'ciceksepeti', 'sahibinden', 'dolap', 'letgo',
    'pazarama', 'idefix', 'd&r', 'e-ticaret', 'eticaret', 'online'
  ],

  'Yemek': [
    'yemeksepeti', 'getir food', 'trendyol yemek', 'mcdonald', 'mcdonalds',
    'burger king', 'pizza hut', 'pizzaci', 'dominos', 'little caesars',
    'kfc', 'popeyes', 'subway', 'starbucks', 'gloria jeans', 'caribou',
    'dunkin', 'costa coffee', 'nero', 'simit sarayı', 'simit sarayi',
    'pret', 'nando', 'çay', 'kahve', 'kahveci', 'kafe', 'cafe',
    'restoran', 'restaurant', 'bistro', 'kebap', 'kebab', 'döner', 'doner',
    'pide', 'lahmacun', 'börek', 'borek', 'kokoreç', 'kokorec',
    'balik', 'balık', 'deniz ürünleri', 'et lokantası', 'et lokantasi',
    'fast food', 'tavuk', 'izgara', 'mangal', 'ocakbaşı', 'ocakbasi'
  ],

  'Ulaşım': [
    'iett', 'metro istanbul', 'marmaray', 'izban', 'üsküdar', 'kadıköy',
    'uber', 'bitaksi', 'bia taksi', 'taksi', 'taxi', 'taxim',
    'turkish airlines', 'thy', 'pegasus', 'sunexpress', 'anadolujet',
    'otogar', 'terminal', 'havalimanı', 'havaalani', 'airport',
    'otobus', 'otobüs', 'pamukkale', 'metro turizm', 'kamil koç',
    'kimilink', 'otopark', 'park ücret', 'belpark', 'ispark',
    'dolmuş', 'dolmus', 'vapur', 'feribot', 'ferry', 'ido',
    'renault', 'fiat', 'araç kiralama', 'rent a car', 'rentacar', 'avis', 'europcar',
    'interrail', 'tren', 'tcdd', 'yht', 'biletix', 'peron'
  ],

  'Akaryakıt': [
    'shell', 'bp', 'opet', 'petrol ofisi', 'total', 'aytemiz', 'moil',
    'lukoil', 'alpet', 'eko', 'go', 'akaryakıt', 'akaryakit',
    'benzin', 'motorin', 'lpg', 'petrol', 'istasyon'
  ],

  'Eğlence': [
    'netflix', 'exxen', 'gain', 'blutv', 'mubi', 'teve2', 'dizibox',
    'biletix', 'passo', 'sinecard', 'cinemaximum', 'cinetech',
    'cineplex', 'sinema', 'cinema', 'movie', 'film',
    'playstation', 'xbox', 'steam', 'epic games', 'nintendo',
    'spotify', 'apple music', 'amazon music', 'deezer',
    'lunapark', 'eğlence merkezi', 'eglence', 'bowling', 'laser',
    'kaçış odası', 'kacis odasi', 'escape room', 'oyun salonu',
    'konser', 'tiyatro', 'müze', 'muze', 'festival'
  ],

  'Sağlık': [
    'eczane', 'pharmacy', 'apotek', 'medikal', 'medical',
    'hastane', 'hastanesi', 'klinik', 'clinic', 'poliklinik',
    'doktor', 'doctor', 'diş', 'dis hekimi', 'dental', 'dent',
    'laboratuvar', 'lab', 'mri', 'tomografi', 'ultrason',
    'optisyen', 'optik', 'gözlük', 'gozluk', 'lens',
    'berber', 'kuaför', 'kuafor', 'coiffure', 'güzellik', 'guzellik',
    'spa', 'masaj', 'massage', 'hamam', 'wellness'
  ],

  'Giyim': [
    'lcw', 'lc waikiki', 'koton', 'defacto', 'mango', 'zara', 'bershka',
    'pull&bear', 'stradivarius', 'marks&spencer', 'marks spencer',
    'vakko', 'beymen', 'ipekyol', 'machka', 'network',
    'adidas', 'nike', 'puma', 'reebok', 'new balance', 'converse',
    'columbia', 'the north face', 'spor', 'spx', 'giyim', 'butik',
    'modanisa', 'trendyol moda', 'flo', 'polaris', 'ayakkabı', 'ayakkabi',
    'çanta', 'canta', 'kemer', 'kravat', 'gömlek', 'gomlek', 'pantolon'
  ],

  'Sigorta': [
    'allianz', 'axa', 'generali', 'zurich', 'mapfre', 'sigorta',
    'eureko', 'groupama', 'ergo', 'hdi', 'türkiye sigorta',
    'güneş sigorta', 'gunes sigorta', 'magdeburger', 'aksigorta',
    'sağlık sigortası', 'kasko', 'trafik sigortası', 'dask'
  ],

  'Fatura': [
    'türk telekom', 'turk telekom', 'vodafone', 'turkcell', 'turknet',
    'superonline', 'kablonet', 'bağnet', 'bagnet', 'ttnet',
    'elektrik', 'doğalgaz', 'dogalgaz', 'ayedaş', 'ayedas',
    'tedaş', 'tedas', 'başkentgaz', 'baskentgaz', 'igdaş', 'igdas',
    'su fatura', 'iski', 'aski', 'belediye su', 'fatura'
  ],

  'Abonelik': [
    'netflix', 'spotify', 'youtube premium', 'apple', 'microsoft',
    'adobe', 'disney', 'hulu', 'paramount', 'hbo', 'amazon prime',
    'linkedin', 'dropbox', 'google one', 'icloud', 'setrow',
    'abonelik', 'subscription', 'premium', 'plus üyelik'
  ],

  'Eğitim': [
    'udemy', 'coursera', 'edx', 'skillshare', 'pluralsight',
    'ders', 'kurs', 'kurslar', 'okul', 'üniversite', 'universite',
    'kolej', 'dershane', 'etüt', 'etut', 'kitap', 'kitabevi',
    'd&r', 'pan', 'idefix', 'bilge adam', 'btek', 'yazılım kursu',
    'sertifika', 'egitim', 'eğitim'
  ],

  'Seyahat': [
    'booking', 'airbnb', 'otel', 'hotel', 'tatil', 'tur',
    'trivago', 'hotels.com', 'expedia', 'tripadvisor', 'enuygun',
    'tatilbudur', 'obilet', 'jollytur', 'neredekal',
    'turkish airlines', 'thy', 'pegasus', 'sunexpress',
    'havalimanı', 'airport', 'bagaj', 'baggage', 'visa fee',
    'konsoloslu', 'consulate', 'yurt dışı', 'yurt disi'
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
 * Returns 'Diğer' when no keyword match is found.
 *
 * @param {string|null|undefined} merchantName - Raw or cleaned merchant name
 * @returns {string} One of the CATEGORIES values
 *
 * @example
 * mapCategory("MIGROS MARKET");         // "Market"
 * mapCategory("Trendyol");              // "Online Alışveriş"
 * mapCategory("STARBUCKS GALATAPORT"); // "Yemek"
 * mapCategory("Shell İstasyon");        // "Akaryakıt"
 * mapCategory(null);                    // "Diğer"
 */
export function mapCategory(merchantName) {
  if (!merchantName || typeof merchantName !== 'string') return 'Diğer';

  const normalized = _normalize(merchantName);

  for (const { keyword, category } of KEYWORD_INDEX) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }

  return 'Diğer';
}

/**
 * Categorizes a batch of transactions in-place, assigning the `category` field.
 * Only sets the category if it is currently empty or 'Diğer'.
 *
 * @param {import('./models.js').Transaction[]} transactions - Array of transaction objects
 * @returns {import('./models.js').Transaction[]} The same array with categories set
 */
export function categorizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];

  return transactions.map((tx) => {
    if (!tx) return tx;
    const needsCategory = !tx.category || tx.category === 'Diğer';
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
 * @returns {Object.<string, number>} Map of category → keyword count
 */
export function getCategoryKeywordCounts() {
  const counts = {};
  for (const category of CATEGORIES) {
    counts[category] = (CATEGORY_KEYWORDS[category] || []).length;
  }
  return counts;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

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
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .trim();
}
