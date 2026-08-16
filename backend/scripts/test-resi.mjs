/**
 * Smoke test for the resi-only lookup path.
 *
 * Uses the couple's real in-flight package (JY1457499661) to prove that
 * courier detection, the primary-address destination, and the honest-estimate
 * fallback all behave correctly BEFORE any courier API key exists.
 *
 * Run:  node backend/scripts/test-resi.mjs [resi]
 */
import { initDatabase } from '../src/db.js';
import { config } from '../src/config.js';
import {
  detectCourierFromAwb,
  scanTrackingNumberWithAI,
  getPrimaryDestination
} from '../src/services/aiService.js';

const resi = process.argv[2] || 'JY1457499661';

console.log('═'.repeat(64));
console.log(`🔍 Uji resi: ${resi}`);
console.log('═'.repeat(64));

await initDatabase();

const detected = detectCourierFromAwb(resi);
console.log('\n1. Deteksi kurir dari format AWB (tanpa AI, tanpa internet)');
console.log('   resi     :', detected.resi);
console.log('   kurir    :', detected.courier);
console.log('   platform :', detected.platform);
console.log('   cocok    :', detected.matched);

const dest = await getPrimaryDestination();
console.log('\n2. Alamat tujuan (dibaca dari alamat utama tersimpan)');
console.log('   label :', dest.label);
console.log('   kota  :', dest.city);
console.log('   koord :', dest.coords.lat, ',', dest.coords.lng);

console.log('\n3. API kurir');
console.log('   provider :', config.courier.provider);
console.log('   api key  :', config.courier.apiKey ? 'terpasang' : 'BELUM ADA');

const result = await scanTrackingNumberWithAI(resi);
console.log('\n4. Hasil scan lengkap');
console.log('   isEstimate     :', result.isEstimate);
console.log('   estimateReason :', result.estimateReason || '-');
console.log('   estimateNote   :', result.estimateNote || '-');
console.log('   status         :', result.status);
console.log('   checkpoint     :', result.checkpointCount);
console.log('   item_title     :', result.item_title);
console.log('   origin_city    :', result.origin_city);
console.log('   dest_city      :', result.destination_city);
console.log('   tracking_url   :', result.tracking_url);
console.log('   koord current  :', JSON.stringify(result.coordinates.current));
console.log('   koord tujuan   :', JSON.stringify(result.coordinates.destination));

const checks = [
  ['Kurir terdeteksi sebagai J&T', /j&t/i.test(result.courier || '')],
  ['Tidak ada checkpoint karangan', result.timeline.length === result.checkpointCount],
  ['Posisi kurir tidak dikarang', result.coordinates.current === null || result.coordinates.currentIsReal],
  ['Tujuan mengikuti alamat tersimpan', result.destination_city === dest.city],
  ['Nama produk tidak ditebak', !/tebakan|kemungkinan/i.test(result.item_title || '')]
];

console.log('\n5. Verifikasi kejujuran data');
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed++;
}

console.log('\n' + '═'.repeat(64));
console.log(failed === 0 ? '✅ SEMUA LOLOS' : `❌ ${failed} GAGAL`);
process.exit(failed === 0 ? 0 : 1);
