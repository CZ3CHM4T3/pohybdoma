// ════════════════════════════════════════════════════════════════════════════
//  Fakturační údaje DODAVATELE (tebe). VYPLŇ své reálné údaje – objeví se na
//  fakturách. IČO a adresa OSVČ jsou stejně veřejné v registru; číslo účtu je
//  na každé faktuře, takže to není tajné.
//  DŮLEŽITÉ: formát „daňového dokladu" a DPH si potvrď s účetní.
// ════════════════════════════════════════════════════════════════════════════

export const INVOICE_SUPPLIER = {
  name: "Mgr. Jan Schröffel", // jméno / název
  address: "", // ulice a č.p.
  city: "", // PSČ a město
  ico: "", // IČO
  dic: "", // DIČ – JEN když jsi plátce DPH, jinak nech prázdné
  iban: "", // IBAN pro QR platbu, např. "CZ6508000000192000145399"
  accountDisplay: "", // číslo účtu pro zobrazení, např. "123456789/0800"
  email: "pohybdoma@seznam.cz",
  phone: "",
};

export const INVOICE_SETTINGS = {
  vatPayer: false, // jsi plátce DPH? (ověř s účetní)
  dueDays: 14, // splatnost ve dnech
  numberPrefix: "", // volitelná předpona čísla faktury (např. "PD")
};

/** Jsou vyplněné aspoň základní údaje pro vystavení faktury? */
export function invoiceConfigured(): boolean {
  return Boolean(INVOICE_SUPPLIER.name && (INVOICE_SUPPLIER.iban || INVOICE_SUPPLIER.accountDisplay));
}
