// Normalise QR verification URLs so harmless differences such as a
// trailing slash or URL fragment do not cause false mismatches.
function normalizeVerificationUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.hash = "";
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }

    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

module.exports = normalizeVerificationUrl;
