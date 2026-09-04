// Přístupový kód pro soukromou bránu webu.
// Bere se z env SITE_ACCESS_CODE. Když není nastavená, brána je VYPNUTÁ
// (web je veřejný a řídí se režimem „připravuje se" – viz src/lib/launch.ts).
// Bránu zase zapneš jen nastavením SITE_ACCESS_CODE ve Vercelu.
export const SITE_GATE_CODE = process.env.SITE_ACCESS_CODE || "";
