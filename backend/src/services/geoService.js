/**
 * City -> coordinate lookup for the delivery map.
 *
 * This is a static gazetteer, and that is fine: it only ever answers "roughly
 * where is this city", which does not change. What it must NEVER do is invent
 * a courier's live position — that now comes from real checkpoints in
 * courierService.js, or is omitted entirely.
 */
export const CITY_COORDINATES = {
  'jakarta': { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
  'jakarta barat': { lat: -6.1683, lng: 106.7588, name: 'Jakarta Barat' },
  'jakarta selatan': { lat: -6.2615, lng: 106.8106, name: 'Jakarta Selatan' },
  'jakarta timur': { lat: -6.2250, lng: 106.9004, name: 'Jakarta Timur' },
  'jakarta utara': { lat: -6.1214, lng: 106.7741, name: 'Jakarta Utara' },
  'jakarta pusat': { lat: -6.1805, lng: 106.8284, name: 'Jakarta Pusat' },
  'tangerang': { lat: -6.1783, lng: 106.6319, name: 'Tangerang' },
  'tangerang selatan': { lat: -6.2889, lng: 106.7179, name: 'Tangerang Selatan' },
  'bekasi': { lat: -6.2383, lng: 106.9756, name: 'Bekasi' },
  'depok': { lat: -6.4025, lng: 106.7942, name: 'Depok' },
  'bogor': { lat: -6.5971, lng: 106.8060, name: 'Bogor' },
  'bandung': { lat: -6.9175, lng: 107.6191, name: 'Bandung' },
  'bandung barat': { lat: -6.8647, lng: 107.4870, name: 'Bandung Barat' },
  'cimahi': { lat: -6.8722, lng: 107.5425, name: 'Cimahi' },
  'cirebon': { lat: -6.7320, lng: 108.5523, name: 'Cirebon' },
  'sukabumi': { lat: -6.9277, lng: 106.9300, name: 'Sukabumi' },
  'garut': { lat: -7.2278, lng: 107.9087, name: 'Garut' },
  'tasikmalaya': { lat: -7.3274, lng: 108.2207, name: 'Tasikmalaya' },
  'surabaya': { lat: -7.2575, lng: 112.7521, name: 'Surabaya' },
  'sidoarjo': { lat: -7.4478, lng: 112.7183, name: 'Sidoarjo' },
  'semarang': { lat: -6.9667, lng: 110.4167, name: 'Semarang' },
  'yogyakarta': { lat: -7.7956, lng: 110.3695, name: 'Yogyakarta' },
  'solo': { lat: -7.5755, lng: 110.8243, name: 'Solo / Surakarta' },
  'surakarta': { lat: -7.5755, lng: 110.8243, name: 'Solo / Surakarta' },
  'malang': { lat: -7.9666, lng: 112.6326, name: 'Malang' },
  'kediri': { lat: -7.8480, lng: 112.0178, name: 'Kediri' },
  'denpasar': { lat: -8.6705, lng: 115.2126, name: 'Denpasar' },
  'bali': { lat: -8.6705, lng: 115.2126, name: 'Denpasar, Bali' },
  'medan': { lat: 3.5952, lng: 98.6722, name: 'Medan' },
  'palembang': { lat: -2.9761, lng: 104.7754, name: 'Palembang' },
  'pekanbaru': { lat: 0.5071, lng: 101.4478, name: 'Pekanbaru' },
  'padang': { lat: -0.9471, lng: 100.4172, name: 'Padang' },
  'lampung': { lat: -5.4294, lng: 105.2610, name: 'Bandar Lampung' },
  'bandar lampung': { lat: -5.4294, lng: 105.2610, name: 'Bandar Lampung' },
  'makassar': { lat: -5.1477, lng: 119.4327, name: 'Makassar' },
  'manado': { lat: 1.4748, lng: 124.8421, name: 'Manado' },
  'balikpapan': { lat: -1.2379, lng: 116.8529, name: 'Balikpapan' },
  'banjarmasin': { lat: -3.3194, lng: 114.5908, name: 'Banjarmasin' },
  'pontianak': { lat: -0.0263, lng: 109.3425, name: 'Pontianak' },
  'samarinda': { lat: -0.5017, lng: 117.1536, name: 'Samarinda' },
  'jambi': { lat: -1.6101, lng: 103.6131, name: 'Jambi' },
  'batam': { lat: 1.0456, lng: 104.0305, name: 'Batam' }
};

/**
 * Resolve a free-text location string (often a courier checkpoint label like
 * "[BANDUNG] DC BANDUNG KOPO") to coordinates.
 *
 * Returns null when the city is genuinely unknown, so callers can omit the
 * marker rather than silently defaulting to Bandung and lying about it.
 */
export function getCityCoordinates(cityName) {
  if (!cityName) return null;

  const raw = String(cityName).toLowerCase();
  // Strip courier noise: bracket tags, hub words, punctuation.
  const cleaned = raw
    .replace(/\[.*?\]/g, ' ')
    .replace(/\b(dc|hub|gateway|sorting|center|centre|warehouse|agen|cabang|drop|point|kota|kab|kabupaten)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Longest key first, so "jakarta barat" wins over "jakarta".
  const keys = Object.keys(CITY_COORDINATES).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (cleaned.includes(key)) return { ...CITY_COORDINATES[key] };
  }
  for (const key of keys) {
    if (raw.includes(key)) return { ...CITY_COORDINATES[key] };
  }

  return null;
}

/**
 * Same as above but never returns null — used for the destination, which we
 * always know from the couple's saved address.
 */
export function getCityCoordinatesOrDefault(cityName, fallbackName = 'Bandung') {
  return (
    getCityCoordinates(cityName) ||
    getCityCoordinates(fallbackName) || { lat: -6.9175, lng: 107.6191, name: 'Bandung' }
  );
}
