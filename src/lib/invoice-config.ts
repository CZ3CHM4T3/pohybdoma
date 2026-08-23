// ════════════════════════════════════════════════════════════════════════════
//  Fakturační údaje DODAVATELE (tebe). VYPLŇ své reálné údaje – objeví se na
//  fakturách. IČO a adresa OSVČ jsou stejně veřejné v registru; číslo účtu je
//  na každé faktuře, takže to není tajné.
//  DŮLEŽITÉ: formát „daňového dokladu" a DPH si potvrď s účetní.
// ════════════════════════════════════════════════════════════════════════════

export const INVOICE_SUPPLIER = {
  name: "Jan Schröffel", // jméno / název
  address: "Chovatelů 159", // ulice a č.p.
  city: "252 09 Hradištko", // PSČ a město
  ico: "04531817", // IČO
  dic: "", // DIČ – JEN když jsi plátce DPH, jinak nech prázdné
  iban: "CZ4130300000003470043017", // IBAN pro QR platbu (spočítán z účtu 3470043017/3030)
  accountDisplay: "3470043017/3030", // číslo účtu pro zobrazení
  email: "pohybdoma@seznam.cz",
  phone: "",
};

export const INVOICE_SETTINGS = {
  vatPayer: false, // Jan není plátce DPH
  dueDays: 14, // splatnost ve dnech
  numberPrefix: "", // volitelná předpona čísla faktury (např. "PD")
};

/** Jsou vyplněné aspoň základní údaje pro vystavení faktury? */
export function invoiceConfigured(): boolean {
  return Boolean(INVOICE_SUPPLIER.name && (INVOICE_SUPPLIER.iban || INVOICE_SUPPLIER.accountDisplay));
}
