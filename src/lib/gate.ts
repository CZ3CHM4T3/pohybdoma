// Přístupový kód pro soukromou bránu webu.
// Bere se z env SITE_ACCESS_CODE, jinak se použije výchozí kód níže.
// Až web spustíš veřejně, řekni a kód odsud odebereme (brána se vypne).
export const SITE_GATE_CODE = process.env.SITE_ACCESS_CODE || "pohyb2026";
