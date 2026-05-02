/**
 * Returns the properly formatted dashboard CTA label with language-aware elision.
 *
 * Rules:
 *   ca, fr → "de {{name}}" becomes "d'{{name}}" before vowels / H
 *            ("Tauler d'Albert", "Tableau d'Emma")
 *   it     → "di {{name}}" becomes "d'{{name}}" before vowels / H
 *            ("Dashboard d'Andrea")
 *   es, en → no elision ("Panel de María", "María's dashboard")
 *
 * @param {string} name      – First name of the authenticated user
 * @param {string} language  – Active i18n language code (es | ca | en | fr | it)
 * @param {Function} t       – Translation function
 * @returns {string}
 */

// Matches the first character being a vowel (including accented) or H/h
const STARTS_WITH_VOWEL_OR_H =
  /^[aeiouAEIOUhHàáâäãåèéêëìíîïòóôöõùúûüÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜæœÆŒ]/;

export function formatDashboardCta(name, language, t) {
  if (!name) return t("landing_cta_dashboard");

  // Base template, e.g. "Tauler de {{name}} →"
  let template = t("landing_cta_dashboard_named");

  if (STARTS_WITH_VOWEL_OR_H.test(name)) {
    if (language === "ca" || language === "fr") {
      template = template.replace("de {{name}}", "d'{{name}}");
    } else if (language === "it") {
      template = template.replace("di {{name}}", "d'{{name}}");
    }
  }

  return template.replace("{{name}}", name);
}
