import fs from 'node:fs';
import path from 'node:path';

const baseDir = path.resolve(process.cwd(), 'src', 'i18n');
const locales = ['es', 'ca', 'en', 'fr', 'it'];

const bundles = Object.fromEntries(
  locales.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(baseDir, `${locale}.json`), 'utf8'))])
);

const allKeys = new Set(locales.flatMap((locale) => Object.keys(bundles[locale])));
let hasErrors = false;

for (const locale of locales) {
  const missing = [...allKeys].filter((key) => !(key in bundles[locale]));
  if (missing.length > 0) {
    hasErrors = true;
    console.error(`[i18n] ${locale}: missing keys (${missing.length})`);
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
  }
}

// Soft warning for untranslated Italian values (same as English),
// excluding neutral/shared terms that are intentionally equal.
const itAllowedEqualToEn = new Set([
  'app_name',
  'host_default_name',
  'email',
  'password',
  'status_no',
  'placeholder_full_name',
  'placeholder_first_name',
  'placeholder_last_name',
  'placeholder_email',
  'placeholder_phone',
  'placeholder_postal_code',
  'placeholder_team',
  'host_conversion_source_email',
  'host_conversion_source_google',
  'logo_fallback'
]);
const sameAsEnglish = Object.keys(bundles.it).filter(
  (key) => bundles.it[key] === bundles.en[key] && !itAllowedEqualToEn.has(key)
);
if (sameAsEnglish.length > 0) {
  console.warn(`[i18n] warning: it has ${sameAsEnglish.length} values equal to en (pending translation).`);
}

if (hasErrors) {
  process.exit(1);
}

console.log('[i18n] locale key parity OK (es, ca, en, fr, it).');
