/**
 * Basic normalization for competitor analysis (spec section 17). We trim,
 * lowercase-compare, and collapse a small set of known common variants.
 * This is intentionally conservative — it should not merge names it isn't
 * confident about. Admins can extend this map later; a JSON map is
 * sufficient for v1 rather than a full admin-editable override UI.
 */
const KNOWN_VARIANTS: Record<string, string> = {
  amazon: "Amazon",
  "amazon.in": "Amazon",
  "amazon india": "Amazon",
  bigbasket: "BigBasket",
  "big basket": "BigBasket",
  blinkit: "Blinkit",
  zepto: "Zepto",
  swiggy: "Swiggy Instamart",
  "swiggy instamart": "Swiggy Instamart",
  instamart: "Swiggy Instamart",
  flipkart: "Flipkart",
  "flipkart grocery": "Flipkart",
  nuts: "Nuts.com",
  "nuts.com": "Nuts.com",
  whatsapp: "WhatsApp seller",
  instagram: "Instagram seller",
};

/** Trims and collapses internal whitespace, keeping case for display. */
export function cleanRawName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Returns a normalized display name for a raw store/website name string.
 * Falls back to a trimmed, title-cased version of the input when no known
 * variant matches — deliberately avoids aggressive fuzzy merging.
 */
export function normalizeStoreName(raw: string): string {
  const cleaned = cleanRawName(raw);
  if (!cleaned) return cleaned;
  const key = cleaned.toLowerCase();
  if (KNOWN_VARIANTS[key]) return KNOWN_VARIANTS[key];

  // Collapse trailing punctuation-only differences, e.g. "Amazon." -> "Amazon"
  const stripped = key.replace(/[.,]+$/g, "");
  if (KNOWN_VARIANTS[stripped]) return KNOWN_VARIANTS[stripped];

  return cleaned;
}
