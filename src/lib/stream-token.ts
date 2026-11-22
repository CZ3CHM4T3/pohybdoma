// ════════════════════════════════════════════════════════════════════════════
//  Cloudflare Stream – podepsané (signed) URL pro placená videa.
//  Pouze SERVER. Podepisuje krátkodobý JWT, který se vkládá místo cf_uid
//  do embed URL (iframe.videodelivery.net/<token>). Funguje jen když je
//  v Cloudflare Stream zapnuté „Require signed URLs".
//
//  ENV (nastav ve Vercelu / .env.local):
//    CF_STREAM_KEY_ID  – ID signing klíče (Cloudflare → Stream → Keys)
//    CF_STREAM_JWK     – JWK privátního klíče (hodnota „jwk" z API, base64 i JSON)
//  Když některá chybí, podepisování je vypnuté a route vrací holé cf_uid
//  (funguje jen dokud NEmáš zapnuté „Require signed URLs").
// ════════════════════════════════════════════════════════════════════════════

const KEY_ID = process.env.CF_STREAM_KEY_ID;
const JWK_RAW = process.env.CF_STREAM_JWK;

/** Je podepisování nakonfigurované (obě ENV proměnné)? */
export function streamSigningConfigured(): boolean {
  return !!(KEY_ID && JWK_RAW);
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64url(s: string): string {
  return bytesToB64url(new TextEncoder().encode(s));
}

/** JWK může přijít jako čisté JSON nebo base64(JSON) – zvládneme obojí. */
function parseJwk(raw: string): JsonWebKey {
  const t = raw.trim();
  if (t.startsWith("{")) return JSON.parse(t) as JsonWebKey;
  const b64 = t.replace(/-/g, "+").replace(/_/g, "/");
  const json =
    typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json) as JsonWebKey;
}

/**
 * Podepíše krátkodobý token pro dané Cloudflare Stream video (cf_uid).
 * Vrací hotový JWT, nebo null když není nakonfigurované podepisování.
 */
export async function signStreamToken(
  uid: string,
  ttlSeconds = 3600
): Promise<string | null> {
  if (!KEY_ID || !JWK_RAW) return null;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const jwk = parseJwk(JWK_RAW);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", kid: KEY_ID };
  const payload = {
    sub: uid,
    kid: KEY_ID,
    exp: now + ttlSeconds,
    nbf: now - 10, // malá tolerance proti rozjetým hodinám
  };

  const signingInput = `${strToB64url(JSON.stringify(header))}.${strToB64url(
    JSON.stringify(payload)
  )}`;

  const key = await subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}
